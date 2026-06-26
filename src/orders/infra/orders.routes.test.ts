import { afterEach, expect, test } from 'bun:test';
import { constants as http2Constants } from 'node:http2';
import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';

import { db } from '../../db/client';
import { orderItems, orders, payments } from '../../db/schema';
import { env } from '../../shared/env.config';
import { toErrorResponse } from '../../shared/http/error-response.helper';
import { ordersRoutes } from './orders.routes';

const createdOrderIds: string[] = [];
type CreatedOrderResponse = { id: string };

const app = () =>
	new Elysia()
		.onError(({ error, set }) => {
			const response = toErrorResponse(error);

			set.status = response.status;

			return response.body;
		})
		.use(ordersRoutes);

afterEach(async () => {
	for (const orderId of createdOrderIds) {
		await db.delete(payments).where(eq(payments.orderId, orderId));
		await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
		await db.delete(orders).where(eq(orders.id, orderId));
	}

	createdOrderIds.length = 0;
});

test('ordersRoutes requires authorization', async () => {
	const response = await app().handle(
		new Request('http://localhost/orders', {
			body: JSON.stringify({
				customer: 'João da Silva',
				items: [{ product: 'Livro de TypeScript', quantity: 1, price: 10000 }],
				payment_method: 'card',
			}),
			headers: { 'content-type': 'application/json' },
			method: 'POST',
		}),
	);

	expect(response.status).toBe(http2Constants.HTTP_STATUS_UNAUTHORIZED);
});

test('ordersRoutes lists and gets orders', async () => {
	const createResponse = await app().handle(
		new Request('http://localhost/orders', {
			body: JSON.stringify({
				customer: 'João da Silva',
				items: [{ product: 'Livro de TypeScript', quantity: 1, price: 10000 }],
				payment_method: 'pix',
			}),
			headers: {
				authorization: `Bearer ${env.authToken}`,
				'content-type': 'application/json',
			},
			method: 'POST',
		}),
	);
	const createdOrder = (await createResponse.json()) as CreatedOrderResponse;
	createdOrderIds.push(createdOrder.id);

	const listResponse = await app().handle(
		new Request('http://localhost/orders?limit=1', {
			headers: { authorization: `Bearer ${env.authToken}` },
		}),
	);
	const getResponse = await app().handle(
		new Request(`http://localhost/orders/${createdOrder.id}`, {
			headers: { authorization: `Bearer ${env.authToken}` },
		}),
	);
	const order = await getResponse.json();

	expect(listResponse.status).toBe(http2Constants.HTTP_STATUS_OK);
	expect(getResponse.status).toBe(http2Constants.HTTP_STATUS_OK);
	expect(order).toMatchObject({
		id: createdOrder.id,
		status: 'awaiting_payment',
		total: 10000,
		payment: {
			method: 'pix',
			status: 'awaiting_payment',
			pix_code: 'PIX-FAKE-COPY-PASTE',
		},
	});
});

test('ordersRoutes returns 404 for missing order', async () => {
	const response = await app().handle(
		new Request(
			'http://localhost/orders/019b4601-0588-7000-8000-000000000000',
			{
				headers: { authorization: `Bearer ${env.authToken}` },
			},
		),
	);

	expect(response.status).toBe(http2Constants.HTTP_STATUS_NOT_FOUND);
});

test('ordersRoutes rejects page sizes above the maximum', async () => {
	const response = await app().handle(
		new Request('http://localhost/orders?limit=101', {
			headers: { authorization: `Bearer ${env.authToken}` },
		}),
	);

	expect(response.status).toBe(http2Constants.HTTP_STATUS_UNPROCESSABLE_ENTITY);
});

test('ordersRoutes rejects invalid order payloads', async () => {
	const invalidSchemaResponse = await app().handle(
		new Request('http://localhost/orders', {
			body: JSON.stringify({
				customer: 'João da Silva',
				items: [{ product: 'Livro de TypeScript', quantity: 1, price: -1 }],
				payment_method: 'pix',
			}),
			headers: {
				authorization: `Bearer ${env.authToken}`,
				'content-type': 'application/json',
			},
			method: 'POST',
		}),
	);
	const invalidDomainResponse = await app().handle(
		new Request('http://localhost/orders', {
			body: JSON.stringify({
				customer: '   ',
				items: [{ product: 'Livro de TypeScript', quantity: 1, price: 10000 }],
				payment_method: 'pix',
			}),
			headers: {
				authorization: `Bearer ${env.authToken}`,
				'content-type': 'application/json',
			},
			method: 'POST',
		}),
	);
	const invalidSchemaBody = await invalidSchemaResponse.json();
	const invalidDomainBody = await invalidDomainResponse.json();

	expect(invalidSchemaResponse.status).toBe(
		http2Constants.HTTP_STATUS_UNPROCESSABLE_ENTITY,
	);
	expect(invalidSchemaBody).toEqual({ error: 'Invalid request payload' });
	expect(invalidDomainResponse.status).toBe(
		http2Constants.HTTP_STATUS_BAD_REQUEST,
	);
	expect(invalidDomainBody).toEqual({ error: 'Order customer is required' });
});
