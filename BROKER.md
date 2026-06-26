# Broker

A mensageria usa Redis com BullMQ para processar webhooks de pagamento fora do
caminho síncrono da requisição.

## Serviços

- `redis`: broker da fila, exposto localmente por `REDIS_PORT`.
- `app`: publica jobs e executa o worker em background no mesmo processo.

Variáveis:

```env
REDIS_URL=redis://localhost:6379
REDIS_PORT=6379
```

No Docker Compose, a aplicação usa `REDIS_URL=redis://redis:6379`.

## Fila

A fila se chama `payment-webhooks`.

O endpoint `POST /webhook/payment` valida autenticação, schema do payload e
status recebido. Se o payload for aceito, ele publica um job e responde:

```json
{
  "event_id": "evt_123",
  "status": "queued"
}
```

Status HTTP: `202 Accepted`.

## Idempotência

Cada job usa `event_id` como `jobId` no BullMQ. Isso evita enfileirar o mesmo
evento mais de uma vez enquanto o job existir no Redis.

A garantia principal continua no PostgreSQL:

- `payment_webhook_events.event_id` tem índice único;
- o worker chama o mesmo `ProcessPaymentWebhookUseCase`;
- o repositório grava o evento e atualiza pedido/pagamento na mesma transaction;
- eventos duplicados retornam o estado atual sem reaplicar efeito.

Redis reduz trabalho repetido. PostgreSQL segue como fonte de verdade.

## Retry

Jobs usam:

- `attempts: 3`;
- backoff exponencial começando em `1000ms`.

Erros HTTP menores que `500` são tratados como permanentes no worker e não
devem ser reprocessados como falha transitória. Erros `5xx` ou inesperados
seguem o retry do BullMQ.

## Fluxo

1. Gateway chama `POST /webhook/payment`.
2. API valida o payload.
3. API publica job em `payment-webhooks`.
4. Worker consome o job.
5. Worker executa `ProcessPaymentWebhookUseCase`.
6. Repositório registra o evento e atualiza o estado dentro da transaction.

## Limite atual

O worker roda dentro do mesmo processo da API para manter a entrega simples.
Se o volume crescer, o próximo passo é criar um comando/processo separado para
rodar workers horizontalmente.
