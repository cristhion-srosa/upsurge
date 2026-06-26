import { constants as http2Constants } from 'node:http2';
import { Elysia } from 'elysia';
import { requireAuth } from '../../shared/http/auth.middleware';
import { errorResponseSchema } from '../../shared/http/error-response.schema';
import type { EnqueuePaymentWebhookUseCase } from '../application/enqueue-payment-webhook.use-case';
import {
	paymentWebhookAcceptedResponseSchema,
	paymentWebhookBodySchema,
	paymentWebhookOpenApiDetail,
} from './payment-webhook.schema';

type EnqueuePaymentWebhook = Pick<EnqueuePaymentWebhookUseCase, 'execute'>;

export const createPaymentWebhookRoutes = (
	enqueuePaymentWebhookUseCase: EnqueuePaymentWebhook,
) =>
	new Elysia({ prefix: '/webhook' }).onRequest(requireAuth).post(
		'/payment',
		async ({ body, set }) => {
			const response = await enqueuePaymentWebhookUseCase.execute({
				eventId: body.event_id,
				orderId: body.order_id,
				status: body.status,
			});

			set.status = http2Constants.HTTP_STATUS_ACCEPTED;

			return response;
		},
		{
			body: paymentWebhookBodySchema,
			detail: paymentWebhookOpenApiDetail,
			response: {
				202: paymentWebhookAcceptedResponseSchema,
				400: errorResponseSchema,
				401: errorResponseSchema,
				422: errorResponseSchema,
			},
		},
	);
