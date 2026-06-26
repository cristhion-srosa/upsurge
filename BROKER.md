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
PAYMENT_WEBHOOK_JOB_ATTEMPTS=3
PAYMENT_WEBHOOK_JOB_BACKOFF_DELAY_MS=1000
PAYMENT_WEBHOOK_JOB_REMOVE_ON_COMPLETE_AGE_SECONDS=604800
PAYMENT_WEBHOOK_JOB_REMOVE_ON_COMPLETE_COUNT=10000
PAYMENT_WEBHOOK_JOB_REMOVE_ON_FAIL_AGE_SECONDS=2592000
PAYMENT_WEBHOOK_JOB_REMOVE_ON_FAIL_COUNT=10000
PAYMENT_WEBHOOK_WORKER_CONCURRENCY=5
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

## Retenção

Jobs concluídos e falhos são removidos pelo BullMQ por idade e por quantidade:

- concluídos: `PAYMENT_WEBHOOK_JOB_REMOVE_ON_COMPLETE_AGE_SECONDS` ou
  `PAYMENT_WEBHOOK_JOB_REMOVE_ON_COMPLETE_COUNT`;
- falhos: `PAYMENT_WEBHOOK_JOB_REMOVE_ON_FAIL_AGE_SECONDS` ou
  `PAYMENT_WEBHOOK_JOB_REMOVE_ON_FAIL_COUNT`.

Os valores padrão mantêm jobs concluídos por até 7 dias e jobs falhos por até
30 dias, limitando cada conjunto a 10.000 jobs.

Essa retenção é operacional. Mesmo após o BullMQ remover um job, reenviar o
mesmo `event_id` continua seguro porque o PostgreSQL mantém o histórico em
`payment_webhook_events`.

## Retry

Jobs usam:

- `PAYMENT_WEBHOOK_JOB_ATTEMPTS`;
- backoff exponencial começando em `PAYMENT_WEBHOOK_JOB_BACKOFF_DELAY_MS`.

Erros HTTP menores que `500` são tratados como permanentes no worker e não
devem ser reprocessados como falha transitória. Erros `5xx` ou inesperados
seguem o retry do BullMQ.

`PAYMENT_WEBHOOK_WORKER_CONCURRENCY` controla quantos jobs o worker consome em
paralelo no processo da API.

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
