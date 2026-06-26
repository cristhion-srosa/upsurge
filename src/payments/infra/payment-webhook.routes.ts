import { Elysia } from 'elysia';
import { requireAuth } from '../../shared/http/auth.middleware';
import { processPaymentWebhookUseCase } from '../application/process-payment-webhook.use-case';
import {
	paymentWebhookBodySchema,
	paymentWebhookOpenApiDetail,
	paymentWebhookResponseSchema,
} from './payment-webhook.schema';

export const paymentWebhookRoutes = new Elysia({ prefix: '/webhook' })
	.onBeforeHandle(requireAuth)
	.post(
		'/payment',
		async ({ body }) =>
			processPaymentWebhookUseCase.execute({
				eventId: body.event_id,
				orderId: body.order_id,
				status: body.status,
			}),
		{
			body: paymentWebhookBodySchema,
			detail: paymentWebhookOpenApiDetail,
			response: {
				200: paymentWebhookResponseSchema,
			},
		},
	);
