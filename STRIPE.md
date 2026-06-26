# Stripe test mode

Esta integração usa Stripe em modo teste. Nenhum pagamento real é criado.

## Variáveis

Configure no `.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=brl
STRIPE_TEST_PAYMENT_METHOD_ID=pm_card_visa
```

- `STRIPE_SECRET_KEY`: chave secreta de teste usada pelo backend para criar
  `PaymentIntent`.
- `STRIPE_WEBHOOK_SECRET`: segredo exibido pelo Stripe CLI ao rodar
  `stripe listen`.
- `STRIPE_CURRENCY`: moeda usada no `PaymentIntent`.
- `STRIPE_TEST_PAYMENT_METHOD_ID`: payment method de teste. O padrão
  `pm_card_visa` aprova o pagamento.

`STRIPE_PUBLISHABLE_KEY` não é usada pela API atual. Ela só seria necessária
em um frontend/checkout client-side.

## Como funciona

Pedidos com `payment_method: "card"` criam um `PaymentIntent` no Stripe test
mode.

O `PaymentIntent` é criado com:

- `amount`: total do pedido em centavos;
- `currency`: `STRIPE_CURRENCY`;
- `payment_method`: `STRIPE_TEST_PAYMENT_METHOD_ID`;
- `payment_method_types: ["card"]`;
- `metadata.order_id`: ID do pedido interno.

O campo `payment_method_types: ["card"]` evita métodos com redirect em um fluxo
backend-only. Sem isso, o Stripe pode exigir `return_url` ao confirmar o
`PaymentIntent`.

O webhook `POST /webhook/stripe` valida `Stripe-Signature` usando
`STRIPE_WEBHOOK_SECRET` e processa:

- `payment_intent.succeeded` -> `paid`;
- `payment_intent.payment_failed` -> `failed`.

Eventos não suportados retornam `200` sem alterar estado.

## Validação local

Suba Postgres, migrations e API:

```sh
docker compose up --build
```

Ou rode localmente:

```sh
docker compose up -d postgres
bun run db:migrate
bun run start
```

Em outro terminal, inicie o listener do Stripe:

```sh
stripe listen --forward-to localhost:3000/webhook/stripe
```

Copie o `whsec_...` impresso pelo comando para `STRIPE_WEBHOOK_SECRET` no
`.env` e reinicie a API.

Crie um pedido com cartão:

```sh
curl -s -X POST http://localhost:3000/orders \
  -H 'authorization: Bearer dev-token' \
  -H 'content-type: application/json' \
  -d '{
    "customer": "Stripe Test",
    "items": [
      { "product": "Livro", "quantity": 1, "price": 10000 }
    ],
    "payment_method": "card"
  }'
```

Resposta esperada:

```json
{
  "id": "...",
  "status": "paid",
  "total": 10000,
  "payment": {
    "method": "card",
    "stripe_payment_intent_id": "pi_..."
  }
}
```

No terminal do `stripe listen`, devem aparecer eventos como:

```text
payment_intent.created
payment_intent.succeeded
POST http://localhost:3000/webhook/stripe [200]
```

Consulte o pedido:

```sh
curl -s http://localhost:3000/orders/<ORDER_ID> \
  -H 'authorization: Bearer dev-token'
```

O pedido deve estar `paid` e deve conter o mesmo `stripe_payment_intent_id`.

## Testes automatizados

```sh
bun test
```

A suíte cobre:

- criação de `PaymentIntent` com parâmetros esperados;
- erro de cartão recusado mapeado para `402`;
- erro upstream do Stripe mapeado para `502`;
- webhook Stripe assinado;
- rejeição de webhook sem assinatura;
- idempotência via `event.id`.

## Troubleshooting

### Erro de `return_url`

Se o Stripe enviar email ou erro dizendo que falta `return_url`, verifique se
o `PaymentIntent` está sendo criado com:

```ts
payment_method_types: ["card"]
```

Essa API não tem checkout frontend. Por isso o fluxo restringe cartão e evita
métodos de pagamento com redirect.

### Webhook retorna 400

Verifique se o `STRIPE_WEBHOOK_SECRET` no `.env` é o mesmo `whsec_...` exibido
pelo `stripe listen` em execução.

### Pedido com cartão retorna 502

Verifique `STRIPE_SECRET_KEY`, conexão com Stripe e se a chave está em modo
teste (`sk_test_...`).
