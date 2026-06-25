import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';

import { env } from './src/shared/env.config';
import { healthRoutes } from './src/shared/http/health.routes';
import { HttpError } from './src/shared/http/http-error.helper';

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
	.onError(({ error, set }) => {
		if (error instanceof HttpError) {
			set.status = error.status;

			return { error: error.message };
		}

		set.status = 500;

		return { error: 'Internal server error' };
	})
	.use(healthRoutes)
	.listen(env.port);

console.log(
	`Server running at http://${app.server?.hostname}:${app.server?.port}`,
);
