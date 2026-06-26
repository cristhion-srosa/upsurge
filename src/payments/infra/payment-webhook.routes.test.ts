import { afterEach, expect, test } from 'bun:test';
import { constants as http2Constants } from 'node:http2';
import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { db } from '../../db/client';
import {
	orderItems,
	orders,
	payments,
	paymentWebhookEvents,
} from '../../db/schema';
import { ordersRoutes } from '../../orders/infra/orders.routes';
import { env } from '../../shared/env.config';
import { toErrorResponse } from '../../shared/http/error-response.helper';
import { paymentWebhookRoutes } from './payment-webhook.routes';

const createdOrderIds: string[] = [];
type CreatedOrderResponse = { id: string };

const app = () =>
	new Elysia()
		.onError(({ error, set }) => {
			const response = toErrorResponse(error);

			set.status = response.status;

			return response.body;
		})
		.use(ordersRoutes)
		.use(paymentWebhookRoutes);

afterEach(async () => {
	for (const orderId of createdOrderIds) {
		await db
			.delete(paymentWebhookEvents)
			.where(eq(paymentWebhookEvents.orderId, orderId));
		await db.delete(payments).where(eq(payments.orderId, orderId));
		await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
		await db.delete(orders).where(eq(orders.id, orderId));
	}

	createdOrderIds.length = 0;
});

const authHeaders = {
	authorization: `Bearer ${env.authToken}`,
	'content-type': 'application/json',
};

const createOrder = async () => {
	const response = await app().handle(
		new Request('http://localhost/orders', {
			body: JSON.stringify({
				customer: 'João da Silva',
				items: [{ product: 'Livro de TypeScript', quantity: 1, price: 10000 }],
				payment_method: 'pix',
			}),
			headers: authHeaders,
			method: 'POST',
		}),
	);
	const order = (await response.json()) as CreatedOrderResponse;
	createdOrderIds.push(order.id);

	return order;
};

test('paymentWebhookRoutes processes duplicate webhooks idempotently', async () => {
	const order = await createOrder();
	const request = () =>
		new Request('http://localhost/webhook/payment', {
			body: JSON.stringify({
				event_id: 'evt_route_duplicate',
				order_id: order.id,
				status: 'approved',
			}),
			headers: authHeaders,
			method: 'POST',
		});

	const firstResponse = await app().handle(request());
	const secondResponse = await app().handle(request());
	const firstBody = await firstResponse.json();
	const secondBody = await secondResponse.json();
	const savedEvents = await db
		.select()
		.from(paymentWebhookEvents)
		.where(eq(paymentWebhookEvents.orderId, order.id));

	expect(firstResponse.status).toBe(http2Constants.HTTP_STATUS_OK);
	expect(secondResponse.status).toBe(http2Constants.HTTP_STATUS_OK);
	expect(firstBody).toEqual({ id: order.id, status: 'paid' });
	expect(secondBody).toEqual({ id: order.id, status: 'paid' });
	expect(savedEvents).toHaveLength(1);
});

test('paymentWebhookRoutes rejects invalid gateway status', async () => {
	const order = await createOrder();
	const response = await app().handle(
		new Request('http://localhost/webhook/payment', {
			body: JSON.stringify({
				event_id: 'evt_invalid_status',
				order_id: order.id,
				status: 'unknown',
			}),
			headers: authHeaders,
			method: 'POST',
		}),
	);

	expect(response.status).toBe(http2Constants.HTTP_STATUS_BAD_REQUEST);
});

test('paymentWebhookRoutes rejects invalid order IDs before hitting the database', async () => {
	const response = await app().handle(
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

test('paymentWebhookRoutes requires authorization', async () => {
	const response = await app().handle(
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
});
