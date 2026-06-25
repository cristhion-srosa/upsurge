# Desafio Técnico - Desenvolvedor(a) Backend

Bem-vindo(a) ao desafio técnico da **Upsurge**. O objetivo aqui não é "passar num teste", e sim nos dar uma amostra real de como você pensa e constrói software backend no domínio em que a gente vive: **pagamentos**.

Trabalhamos com infraestrutura financeira (Pix, cartão, conciliação), então valorizamos quem se preocupa com **consistência, integridade de dados e clareza de modelagem** - mais do que com quantidade de features.

---

## O que você vai construir

Uma **API REST** para criar pedidos e processar pagamentos. O cliente cria um pedido, escolhe um método de pagamento (cartão, boleto ou Pix), e o sistema acompanha o ciclo de vida do pagamento até a confirmação - inclusive recebendo notificações via **webhook**, como acontece com gateways reais.

---

## Escopo e expectativa de tempo

> **Estimamos de 4 a 6 horas de trabalho.** Você tem até **2 dias a partir do recebimento do desafio** para entregar.
>
> **Não esperamos perfeição nem todos os extras.** Priorize a qualidade do núcleo (modelagem, fluxo de pagamento, consistência) sobre a quantidade de funcionalidades. Saber o que **não** fazer no tempo disponível também é uma competência que avaliamos - se faltar tempo, deixe registrado no README o que você faria a seguir.

---

## Requisitos obrigatórios

### Funcionalidades

- **Criação de pedido**
  - Criar um pedido com **itens** (produto, quantidade, preço), o **valor total** calculado pelo servidor e o **método de pagamento** (`card`, `boleto` ou `pix`).
  - O total **nunca** deve vir do cliente - calcule no backend a partir dos itens.

- **Processamento de pagamento (simulado)**
  - `card` → aprova automaticamente e o pedido vai para `paid`.
  - `boleto` → gera um código fictício e o pedido fica `awaiting_payment`.
  - `pix` → gera um código/copia-e-cola fictício e o pedido fica `awaiting_payment`.

- **Consulta de pedidos**
  - Listar pedidos e visualizar os detalhes de um pedido específico, incluindo o status atual do pagamento.

- **Webhook de pagamento**
  - Endpoint para receber atualizações de pagamento (como um gateway real notificaria).
  - **Idempotência (requisito central):** gateways reais reenviam a mesma notificação mais de uma vez, fora de ordem, ou em duplicidade. Garanta que **processar o mesmo evento duas vezes não cause efeito duplicado** (ex.: marcar como pago duas vezes, creditar em dobro). Como você resolve isso é um dos pontos que mais nos interessa.

- **Persistência**
  - **PostgreSQL** com **Drizzle ORM** para pedidos, itens e estados de pagamento.

### Padrão de status

Use estes status, em inglês, de forma consistente em toda a API:

| Status | Significado |
|---|---|
| `pending` | Pedido criado, pagamento ainda não iniciado |
| `awaiting_payment` | Aguardando confirmação (boleto/Pix) |
| `paid` | Pagamento confirmado |
| `failed` | Pagamento recusado ou expirado |

---

## Requisitos técnicos

- **TypeScript**.
- **Runtime livre** - usamos **Bun** no dia a dia, então é um diferencial, mas Node.js é totalmente aceito. Avaliamos seu raciocínio, não o runtime.
- Framework HTTP de sua preferência (ex.: Hono, Fastify, Express).
- **Arquitetura organizada por casos de uso** (Use Cases), com separação clara entre domínio, aplicação e infraestrutura. Apreciamos princípios de Clean Architecture / ports-and-adapters, mas sem dogmatismo - queremos ver intenção, não cerimônia.
- **Docker** para subir o ambiente (app + Postgres) com o mínimo de fricção.
- **Autenticação** simples nos endpoints (um token fixo via header já basta - não precisa de fluxo completo de auth).
- Tratamento explícito de **erros e casos de borda**.

---

## Diferenciais (opcionais)

Não são obrigatórios. Use-os para mostrar profundidade **se sobrar tempo** - e só depois de o núcleo estar sólido.

- Integração real com um gateway (Pagar.me, Stripe, Mercado Pago, etc.).
- Mensageria (Redis, SQS) para processar pagamentos de forma assíncrona.
- Testes unitários e/ou de integração - especialmente cobrindo o webhook e a idempotência.
- Deploy em serviço gratuito (Render, Railway, Fly.io, AWS Free Tier).
- Observabilidade básica (logs estruturados, health check).

---

## Exemplos de uso

### Criar pedido

`POST /orders`

```json
{
  "customer": "João da Silva",
  "items": [
    { "product": "Livro de TypeScript", "quantity": 2, "price": 10000 }
  ],
  "payment_method": "pix"
}
```

> Valores monetários em **centavos** (inteiro). `10000` = R$ 100,00. Evite `float` para dinheiro.

**Resposta - pedido via Pix (aguardando pagamento):**

```json
{
  "id": "abc123",
  "status": "awaiting_payment",
  "total": 20000,
  "payment": {
    "method": "pix",
    "pix_code": "00020126...FAKE"
  }
}
```

**Resposta - pedido via cartão (aprovado na hora):**

```json
{
  "id": "def456",
  "status": "paid",
  "total": 20000,
  "payment": {
    "method": "card"
  }
}
```

### Webhook de pagamento

`POST /webhook/payment`

```json
{
  "event_id": "evt_789",
  "order_id": "abc123",
  "status": "approved"
}
```

**Resposta:**

```json
{
  "id": "abc123",
  "status": "paid"
}
```

> O mesmo `event_id` pode chegar mais de uma vez. O resultado deve ser o mesmo de quando chegou pela primeira vez - sem efeito duplicado.

---

## Como avaliamos

Em ordem de peso:

1. **Modelagem de dados e domínio** - schema bem pensado (relações, índices, tipos), valores monetários corretos (centavos/inteiro, nunca `float`), nomes claros.
2. **Consistência e idempotência** - como você garante que o webhook não processa o mesmo evento duas vezes, e como lida com falha no meio do fluxo.
3. **Arquitetura e organização** - separação de responsabilidades, casos de uso legíveis, código que outra pessoa manteria sem sofrer.
4. **Tratamento de erros e casos de borda** - pedido inexistente, payload inválido, pagamento recusado, valores inválidos.
5. **Boas práticas gerais** - clareza dos commits (a evolução do histórico conta), uso correto do Drizzle, documentação objetiva.
6. **Diferenciais** - quando presentes e bem feitos, especialmente testes cobrindo o webhook.

Não buscamos a solução "certa" única. Buscamos entender **como você decide** - e decisões bem justificadas no README valem tanto quanto o código.

---

## Como entregar

1. Faça um **fork** deste repositório para a sua conta do GitHub.
2. Implemente a solução no seu fork.
3. **Documente no README**: como rodar o projeto (idealmente um `docker compose up`), as principais decisões de arquitetura que você tomou, e o que faria a seguir se tivesse mais tempo.
4. Envie o link do repositório para **guilherme@upsurge.com.br** com o assunto **"Desafio Técnico - Backend"**.

---

## Dúvidas

Ficou algo ambíguo no enunciado? Faça uma suposição razoável, **registre-a no README** e siga em frente - é exatamente assim que trabalhamos com problemas reais. Se preferir, pode também nos perguntar diretamente.

Boa sorte. Estamos animados para ver o que você vai construir.
