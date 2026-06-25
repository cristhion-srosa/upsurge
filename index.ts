import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';

import { db } from './src/db/client';
import { env } from './src/shared/env';

const app = new Elysia()
	.use(
		openapi({
			documentation: {
				info: {
					title: 'Upsurge API',
					version: '0.1.0',
				},
			},
		}),
	)
	.get('/health', () => ({ status: 'ok' }))
	.get('/health/db', async () => {
		await db.execute('select 1');

		return { status: 'ok' };
	})
	.listen(env.port);

console.log(
	`Server running at http://${app.server?.hostname}:${app.server?.port}`,
);
