import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';

import { env } from './src/shared/env.config';
import { healthRoutes } from './src/shared/http/health.routes';

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
	.use(healthRoutes)
	.listen(env.port);

console.log(
	`Server running at http://${app.server?.hostname}:${app.server?.port}`,
);
