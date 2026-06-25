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
`*.controller.ts`, `*.middleware.ts`, `*.schema.ts` ou `*.use-case.ts`.
