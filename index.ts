import { constants as http2Constants } from 'node:http2';
import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { ordersRoutes } from './src/orders/infra/orders.routes';
import { paymentWebhookRoutes } from './src/payments/infra/payment-webhook.routes';
import { env } from './src/shared/env.config';
import { healthRoutes } from './src/shared/http/health.routes';
import { HttpError } from './src/shared/http/http-error.helper';
import { logger } from './src/shared/logger/logger.helper';

const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : 'Unknown error';
const errorStatus = (error: unknown) => {
	if (!error || typeof error !== 'object' || !('status' in error)) {
		return http2Constants.HTTP_STATUS_INTERNAL_SERVER_ERROR;
	}

	const { status } = error;

	return typeof status === 'number'
		? status
		: http2Constants.HTTP_STATUS_INTERNAL_SERVER_ERROR;
};

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

		const status = errorStatus(error);

		set.status = status;
		logger.error('unhandled_error', { message: errorMessage(error) });

		if (status !== http2Constants.HTTP_STATUS_INTERNAL_SERVER_ERROR) {
			return { error: errorMessage(error) };
		}

		return { error: 'Internal server error' };
	})
	.use(healthRoutes)
	.use(ordersRoutes)
	.use(paymentWebhookRoutes)
	.listen(env.port);

logger.info('server_started', {
	hostname: app.server?.hostname,
	port: app.server?.port,
});
