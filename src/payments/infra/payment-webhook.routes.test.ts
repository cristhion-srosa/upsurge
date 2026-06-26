import { expect, test } from 'bun:test';
import { constants as http2Constants } from 'node:http2';
import { Elysia } from 'elysia';
import { env } from '../../shared/env.config';
import { toErrorResponse } from '../../shared/http/error-response.helper';
import { EnqueuePaymentWebhookUseCase } from '../application/enqueue-payment-webhook.use-case';
import type { PaymentWebhookJob } from '../application/payment-webhook-queue.port';
import { createPaymentWebhookRoutes } from './payment-webhook.routes';

const authHeaders = {
	authorization: `Bearer ${env.authToken}`,
	'content-type': 'application/json',
};

const app = (calls: PaymentWebhookJob[]) =>
	new Elysia()
		.onError(({ error, set }) => {
			const response = toErrorResponse(error);

			set.status = response.status;

			return response.body;
		})
		.use(
			createPaymentWebhookRoutes(
				new EnqueuePaymentWebhookUseCase({
					enqueue: async (input) => {
						calls.push(input);
					},
				}),
			),
		);

test('paymentWebhookRoutes queues payment webhooks', async () => {
	const calls: PaymentWebhookJob[] = [];
	const response = await app(calls).handle(
		new Request('http://localhost/webhook/payment', {
			body: JSON.stringify({
				event_id: 'evt_route_queue',
				order_id: '019b4601-0588-7000-8000-000000000000',
				status: 'approved',
			}),
			headers: authHeaders,
			method: 'POST',
		}),
	);

	expect(response.status).toBe(http2Constants.HTTP_STATUS_ACCEPTED);
	expect(await response.json()).toEqual({
		event_id: 'evt_route_queue',
		status: 'queued',
	});
	expect(calls).toEqual([
		{
			eventId: 'evt_route_queue',
			orderId: '019b4601-0588-7000-8000-000000000000',
			status: 'approved',
		},
	]);
});

test('paymentWebhookRoutes rejects invalid gateway status', async () => {
	const response = await app([]).handle(
		new Request('http://localhost/webhook/payment', {
			body: JSON.stringify({
				event_id: 'evt_invalid_status',
				order_id: '019b4601-0588-7000-8000-000000000000',
				status: 'unknown',
			}),
			headers: authHeaders,
			method: 'POST',
		}),
	);

	expect(response.status).toBe(http2Constants.HTTP_STATUS_BAD_REQUEST);
});

test('paymentWebhookRoutes rejects invalid order IDs before queueing', async () => {
	const response = await app([]).handle(
		new Request('http://localhost/webhook/payment', {
			body: JSON.stringify({
				event_id: 'evt_invalid_order_id',
				order_id: '1k34nm',
				status: 'approved',
			}),
			headers: authHeaders,
			method: 'POST',
		}),
	);
	const body = await response.json();

	expect(response.status).toBe(http2Constants.HTTP_STATUS_UNPROCESSABLE_ENTITY);
	expect(body).toEqual({
		error: {
			code: 'invalid_request',
			fields: [
				{
					message: 'Expected Order ID to be a valid value',
					path: 'order_id',
				},
			],
			message: 'Invalid request payload',
		},
	});
});

test('paymentWebhookRoutes requires authorization before queueing', async () => {
	const calls: PaymentWebhookJob[] = [];
	const response = await app(calls).handle(
		new Request('http://localhost/webhook/payment', {
			body: JSON.stringify({
				event_id: 'evt_unauthorized',
				order_id: '019b4601-0588-7000-8000-000000000000',
				status: 'approved',
			}),
			headers: { 'content-type': 'application/json' },
			method: 'POST',
		}),
	);

	expect(response.status).toBe(http2Constants.HTTP_STATUS_UNAUTHORIZED);
	expect(await response.json()).toEqual({
		error: {
			code: 'unauthorized',
			message: 'Unauthorized',
		},
	});
	expect(calls).toEqual([]);
});
