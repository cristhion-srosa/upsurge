import { Elysia } from 'elysia';

import { db } from './src/db/client';

const { PORT } = process.env;

const app = new Elysia()
	.get('/health', () => ({ status: 'ok' }))
	.get('/health/db', async () => {
		await db.execute('select 1');

		return { status: 'ok' };
	})
	.listen(PORT ?? 3000);

console.log(
	`Server running at http://${app.server?.hostname}:${app.server?.port}`,
);
