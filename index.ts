import { Elysia } from 'elysia';

const { PORT } = process.env;

const app = new Elysia()
	.get('/health', () => ({ status: 'ok' }))
	.listen(PORT ?? 3000);

console.log(
	`Server running at http://${app.server?.hostname}:${app.server?.port}`,
);
