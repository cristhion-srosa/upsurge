import { Elysia } from 'elysia';
import { processStripeWebhookUseCase } from '../application/process-stripe-webhook.use-case';
import {
	stripeWebhookOpenApiDetail,
	stripeWebhookResponseSchema,
} from './stripe-webhook.schema';

export const stripeWebhookRoutes = new Elysia({ prefix: '/webhook' }).post(
	'/stripe',
	async ({ body, headers }) =>
		processStripeWebhookUseCase.execute({
			payload: typeof body === 'string' ? body : '',
			signature: headers['stripe-signature'],
		}),
	{
		detail: stripeWebhookOpenApiDetail,
		parse: 'text',
		response: {
			200: stripeWebhookResponseSchema,
		},
	},
);
