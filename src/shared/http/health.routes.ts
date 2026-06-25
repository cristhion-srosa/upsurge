import { Elysia } from 'elysia';

import { db } from '../../db/client';

export const healthRoutes = new Elysia()
	.get('/health', () => ({ status: 'ok' }))
	.get('/health/db', async () => {
		await db.execute('select 1');

		return { status: 'ok' };
	});
