# Arquitetura

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
