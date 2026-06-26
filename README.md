# Upsurge API

API REST para criação de pedidos e processamento simulado de pagamentos.

## Como rodar

Crie o arquivo `.env` a partir do exemplo:

```sh
cp .env.example .env
```

Instale as dependências:

```sh
bun install
```

Suba app, migrations e Postgres:

```sh
docker compose up --build
```

O Compose espera o Postgres ficar saudável, executa `bun run db:migrate` no
serviço `migrate` e então inicia a API.

Para rodar fora do container, suba apenas o Postgres:

```sh
docker compose up -d postgres
```

Execute as migrations:

```sh
bun run db:migrate
```

Inicie a API:

```sh
bun run start
```

Por padrão a API sobe em `http://localhost:3000` e usa `dev-token` como token
local.

## Playground OpenAPI

Com a API rodando, acesse o playground interativo em:

```txt
http://localhost:3000/openapi
```

A especificação OpenAPI em JSON fica em:

```txt
http://localhost:3000/openapi/json
```

O plugin `@elysiajs/openapi` usa Scalar como frontend padrão, funcionando como
playground para testar os endpoints documentados.

Para usar Stripe em modo teste, configure também:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=brl
STRIPE_TEST_PAYMENT_METHOD_ID=pm_card_visa
```

Veja [STRIPE.md](./STRIPE.md) para detalhes da configuração e validação do
fluxo com Stripe CLI.

Uma versão alternativa com mensageria Redis/BullMQ para processamento
assíncrono de webhooks está na branch `feat/redis-bullmq-messaging`.

Para comandos locais, `DATABASE_URL` aponta para `localhost:5433`. O Docker
Compose sobrescreve a URL dos containers da API e de migrations para usar o
hostname interno `postgres`.

## Testes e validação

```sh
bun run typecheck
bun run check
bun run lint
bun run ci
bun test
```

## Exemplos

Crie um pedido Pix:

```sh
curl -s -X POST http://localhost:3000/orders \
  -H 'authorization: Bearer dev-token' \
  -H 'content-type: application/json' \
  -d '{
    "customer": "João da Silva",
    "items": [
      { "product": "Livro de TypeScript", "quantity": 2, "price": 10000 }
    ],
    "payment_method": "pix"
  }'
```

Crie um pedido com cartão via Stripe test mode:

```sh
curl -s -X POST http://localhost:3000/orders \
  -H 'authorization: Bearer dev-token' \
  -H 'content-type: application/json' \
  -d '{
    "customer": "João da Silva",
    "items": [
      { "product": "Livro de TypeScript", "quantity": 1, "price": 10000 }
    ],
    "payment_method": "card"
  }'
```

A resposta inclui `stripe_payment_intent_id` quando o pagamento por cartão é
criado no Stripe.

Liste pedidos:

```sh
curl -s 'http://localhost:3000/orders?limit=20' \
  -H 'authorization: Bearer dev-token'
```

Consulte um pedido:

```sh
curl -s http://localhost:3000/orders/<ORDER_ID> \
  -H 'authorization: Bearer dev-token'
```

Processe um webhook de pagamento:

```sh
curl -s -X POST http://localhost:3000/webhook/payment \
  -H 'authorization: Bearer dev-token' \
  -H 'content-type: application/json' \
  -d '{
    "event_id": "evt_123",
    "order_id": "<ORDER_ID>",
    "status": "approved"
  }'
```

Receba webhooks reais do Stripe CLI:

```sh
stripe listen --forward-to localhost:3000/webhook/stripe
```

Copie o `whsec_...` exibido pelo CLI para `STRIPE_WEBHOOK_SECRET` antes de
iniciar a API.

## Arquitetura

O código é organizado por caso de uso, com separação simples entre domínio,
aplicação e infraestrutura.

- `orders/domain`: regras e tipos do domínio de pedidos.
- `orders/application`: casos de uso de pedidos, usando o sufixo `*.use-case.ts`.
- `orders/infra`: adaptadores de pedidos, como `*.repository.ts` e `*.routes.ts`.
- `payments/domain`: regras e tipos do domínio de pagamentos.
- `payments/application`: casos de uso de pagamentos, Stripe e webhook.
- `payments/infra`: adaptadores de pagamentos.
- `shared`: código transversal usado por mais de um módulo.

Arquivos devem ter nomes que indiquem seu papel quando houver um padrão claro,
como `*.config.ts`, `*.helper.ts`, `*.service.ts`, `*.repository.ts`,
`*.routes.ts`, `*.middleware.ts`, `*.schema.ts` ou `*.use-case.ts`.

No domínio, entidades como `Order` concentram os dados e comportamentos que
protegem regras do negócio, como validar itens e calcular totais.

## Decisões de domínio

### Dinheiro

Valores monetários são inteiros em centavos. O total do pedido é sempre
calculado pelo servidor a partir dos itens.

### Status e métodos

Status e métodos são definidos no domínio como objetos `as const` com union
types derivados. Isso evita espalhar strings soltas pelo código de produção e
mantém compatibilidade com os enums PostgreSQL definidos via Drizzle.

### Drizzle

O projeto usa Drizzle como query builder tipado e mantém as consultas
explícitas nos repositórios. A relational query API não foi usada porque os
fluxos atuais precisam de poucas consultas, transações claras e montagem manual
dos read models. Isso deixa o SQL gerado mais previsível e evita esconder a
lógica de idempotência e consistência atrás de uma camada mais abstrata.

### UUIDs

As chaves primárias usam UUID v7. O schema define `DEFAULT uuidv7()` no
PostgreSQL para `orders`, `order_items`, `payments` e
`payment_webhook_events`.

UUID v7 foi preferido a UUID v4 porque mantém ordenação temporal.
Na prática, isso melhora localidade em índices B-tree e simplifica a paginação por
cursor cronológico.
Também inclui uma melhor performance em buscas se comparado ao v4.

A aplicação ainda pode gerar IDs antes do insert quando precisa deles no fluxo
de domínio, como no `metadata.order_id` enviado ao Stripe.

O Docker usa PostgreSQL 18, que já inclui `uuidv7()` nativo. O healthcheck do
container valida a disponibilidade da função antes de liberar migrations e app.

### Autenticação

Os endpoints da API devem usar token fixo no header `Authorization`:

```text
Authorization: Bearer <AUTH_TOKEN>
```

Rotas de health ficam públicas.

### Logs estruturados

A API usa logs em JSON pelo helper `logger`. Cada log deve ter `level`,
`message`, `time` e campos extras de contexto quando necessário. Por enquanto
isso cobre startup e erros HTTP sem adicionar dependência de logging.

### Idempotência do webhook

Webhooks de pagamento são idempotentes pelo `event_id` enviado pelo gateway.
Cada evento recebido será salvo em `payment_webhook_events`, que possui índice
único em `event_id`.

O processamento acontece dentro de uma transaction:

1. tentar inserir o evento recebido;
2. se o `event_id` já existir, não aplicar nenhum efeito novamente;
3. se for um evento novo, atualizar `payments` e `orders` na mesma transaction.

### Eventos fora de ordem

O pagamento terá transições de estado conservadoras:

- `pending` pode virar `awaiting_payment`, `paid` ou `failed`;
- `awaiting_payment` pode virar `paid` ou `failed`;
- `paid` e `failed` são estados terminais.

Se um evento antigo chegar depois que o pagamento já estiver em estado terminal,
o evento ainda será registrado para auditoria, mas não mudará o estado atual.

### Stripe test mode

Pedidos com `payment_method: "card"` criam um `PaymentIntent` no Stripe test
mode. O pedido usa `metadata.order_id` para reconciliar o webhook recebido com
o pedido interno.

O endpoint `POST /webhook/stripe` valida a assinatura `Stripe-Signature` com
`STRIPE_WEBHOOK_SECRET`. Os eventos tratados são:

- `payment_intent.succeeded` -> `paid`;
- `payment_intent.payment_failed` -> `failed`.

Eventos Stripe sem suporte retornam sucesso sem alterar estado, evitando retry
desnecessário do gateway. O identificador `event.id` do Stripe é usado como
chave de idempotência.

Para evitar redirects em um fluxo backend-only de teste, o `PaymentIntent` é
criado com `payment_method_types: ["card"]` e `pm_card_visa` por padrão.

Falhas de cartão são retornadas como `402 Payment Required`; falhas de API ou
conectividade com o Stripe são retornadas como `502 Bad Gateway`.

## Próximos passos

- Sistema de autenticação completo com JWT
- Integração completa com stripe
- Mensageria com redis
- Separação horizontal da arquitetura interna (conforme o tamanho do projeto)
