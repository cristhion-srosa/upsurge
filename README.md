# Upsurge API

API REST para criação de pedidos e processamento simulado de pagamentos.

## Como rodar

Instale as dependências:

```sh
bun install
```

Suba o Postgres:

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

Para comandos locais, `DATABASE_URL` e `DATABASE_MIGRATION_URL` apontam para
`localhost:5433`. O Docker Compose sobrescreve a URL do container da API para
usar o hostname interno `postgres`.

## Arquitetura

O código é organizado por caso de uso, com separação simples entre domínio,
aplicação e infraestrutura.

- `orders/domain`: regras e tipos do domínio de pedidos.
- `orders/application`: casos de uso de pedidos, usando o sufixo `*.use-case.ts`.
- `orders/infra`: adaptadores de pedidos, como `*.repository.ts` e `*.controller.ts`.
- `payments/domain`: regras e tipos do domínio de pagamentos.
- `payments/application`: casos de uso de pagamentos e webhook.
- `payments/infra`: adaptadores de pagamentos.
- `shared`: código transversal usado por mais de um módulo.

Arquivos devem ter nomes que indiquem seu papel quando houver um padrão claro,
como `*.config.ts`, `*.helper.ts`, `*.service.ts`, `*.repository.ts`,
`*.controller.ts`, `*.routes.ts`, `*.middleware.ts`, `*.schema.ts` ou
`*.use-case.ts`.

## Decisões de domínio

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

Webhooks de pagamento serão idempotentes pelo `event_id` enviado pelo gateway.
Cada evento recebido será salvo em `payment_webhook_events`, que possui índice
único em `event_id`.

O processamento deve acontecer dentro de uma transaction:

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
