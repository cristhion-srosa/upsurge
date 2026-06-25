import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';

import { env } from './src/shared/env.config';
import { healthRoutes } from './src/shared/http/health.routes';
import { HttpError } from './src/shared/http/http-error.helper';
import { logger } from './src/shared/logger/logger.helper';

const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : 'Unknown error';

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
			logger.info('http_error', {
				message: error.message,
				status: error.status,
			});

			return { error: error.message };
		}

		set.status = 500;
		logger.error('unhandled_error', { message: errorMessage(error) });

		return { error: 'Internal server error' };
	})
	.use(healthRoutes)
	.listen(env.port);

logger.info('server_started', {
	hostname: app.server?.hostname,
	port: app.server?.port,
});
