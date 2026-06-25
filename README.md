# upsurge

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

For local commands, `DATABASE_URL` and `DATABASE_MIGRATION_URL` point to
`localhost:5433`. Docker Compose overrides the app container URL to use the
internal `postgres` hostname.

This project was created using `bun init` in bun v1.3.13. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
