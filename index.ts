import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { ordersRoutes } from './src/orders/infra/orders.routes';
import { EnqueuePaymentWebhookUseCase } from './src/payments/application/enqueue-payment-webhook.use-case';
import {
	bullMqPaymentWebhookQueue,
	startPaymentWebhookWorker,
} from './src/payments/infra/payment-webhook.queue';
import { createPaymentWebhookRoutes } from './src/payments/infra/payment-webhook.routes';
import { stripeWebhookRoutes } from './src/payments/infra/stripe-webhook.routes';
import { env } from './src/shared/env.config';
import {
	isValidationError,
	toErrorResponse,
} from './src/shared/http/error-response.helper';
import { healthRoutes } from './src/shared/http/health.routes';
import { HttpError } from './src/shared/http/http-error.helper';
import { requestPathname } from './src/shared/http/request-url.helper';
import { logger } from './src/shared/logger/logger.helper';

const requestStartTimes = new WeakMap<Request, number>();

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
	.onRequest(({ request }) => {
		requestStartTimes.set(request, performance.now());
	})
	.onAfterResponse(({ request, set }) => {
		const startTime = requestStartTimes.get(request);

		logger.info('http_request', {
			duration_ms:
				startTime === undefined
					? undefined
					: Math.round(performance.now() - startTime),
			method: request.method,
			path: requestPathname(request),
			status: set.status ?? 200,
		});
	})
	.onError(({ error, set }) => {
		const response = toErrorResponse(error);

		set.status = response.status;

		if (error instanceof HttpError) {
			logger.info('http_error', {
				message: error.message,
				status: error.status,
			});

			return response.body;
		}

		if (isValidationError(error)) {
			logger.info('validation_error', { status: response.status });

			return response.body;
		}

		logger.error('unhandled_error', {
			message: error instanceof Error ? error.message : 'Unknown error',
		});

		return response.body;
	})
	.use(healthRoutes)
	.use(ordersRoutes)
	.use(
		createPaymentWebhookRoutes(
			new EnqueuePaymentWebhookUseCase(bullMqPaymentWebhookQueue),
		),
	)
	.use(stripeWebhookRoutes)
	.listen(env.port);
const paymentWebhookWorker = startPaymentWebhookWorker();

logger.info('server_started', {
	hostname: app.server?.hostname,
	port: app.server?.port,
});

const shutdown = async () => {
	await paymentWebhookWorker.close();
	app.stop();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
