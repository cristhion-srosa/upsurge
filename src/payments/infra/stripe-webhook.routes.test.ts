import { afterEach, expect, test } from 'bun:test';
import { constants as http2Constants } from 'node:http2';
import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import Stripe from 'stripe';
import { db } from '../../db/client';
import {
	orderItems,
	orders,
	payments,
	paymentWebhookEvents,
} from '../../db/schema';
import { Order } from '../../orders/domain/order.entity';
import { orderRepository } from '../../orders/infra/order.repository';
import { env } from '../../shared/env.config';
import { toErrorResponse } from '../../shared/http/error-response.helper';
import { simulatePayment } from '../domain/payment-simulation.service';
import { stripeWebhookRoutes } from './stripe-webhook.routes';

const createdOrderIds: string[] = [];

const app = () =>
	new Elysia()
		.onError(({ error, set }) => {
			const response = toErrorResponse(error);

			set.status = response.status;

			return response.body;
		})
		.use(stripeWebhookRoutes);

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

const createAwaitingOrder = async () => {
	const order = Order.create({
		customer: 'Stripe Webhook Test',
		items: [{ product: 'Livro de TypeScript', quantity: 1, price: 10000 }],
		paymentMethod: 'pix',
	});

	createdOrderIds.push(order.id);
	await orderRepository.createWithPayment(
		order,
		simulatePayment(order.paymentMethod),
	);

	return order;
};

const signedStripeRequest = async (payload: string) => {
	const signature = await Stripe.webhooks.generateTestHeaderStringAsync({
		payload,
		secret: env.stripeWebhookSecret,
	});

	return new Request('http://localhost/webhook/stripe', {
		body: payload,
		headers: {
			'content-type': 'application/json',
			'stripe-signature': signature,
		},
		method: 'POST',
	});
};

test('stripeWebhookRoutes processes signed Stripe payment succeeded events', async () => {
	const order = await createAwaitingOrder();
	const payload = JSON.stringify({
		id: 'evt_stripe_route_success',
		type: 'payment_intent.succeeded',
		data: {
			object: {
				id: 'pi_route_success',
				object: 'payment_intent',
				metadata: { order_id: order.id },
			},
		},
	});

	const response = await app().handle(await signedStripeRequest(payload));
	const body = await response.json();
	const [savedPayment] = await db
		.select()
		.from(payments)
		.where(eq(payments.orderId, order.id));

	expect(response.status).toBe(http2Constants.HTTP_STATUS_OK);
	expect(body).toEqual({ id: order.id, status: 'paid' });
	expect(savedPayment?.status).toBe('paid');
});

test('stripeWebhookRoutes rejects invalid order ID metadata', async () => {
	const payload = JSON.stringify({
		id: 'evt_stripe_invalid_order_id',
		type: 'payment_intent.succeeded',
		data: {
			object: {
				id: 'pi_invalid_order_id',
				object: 'payment_intent',
				metadata: { order_id: '1k34nm' },
			},
		},
	});

	const response = await app().handle(await signedStripeRequest(payload));
	const body = await response.json();

	expect(response.status).toBe(http2Constants.HTTP_STATUS_BAD_REQUEST);
	expect(body).toEqual({
		error: {
			code: 'stripe_payment_intent_metadata_order_id_must_be_a_uuid',
			message: 'Stripe PaymentIntent metadata.order_id must be a UUID',
		},
	});
});

test('stripeWebhookRoutes rejects unsigned Stripe webhooks', async () => {
	const response = await app().handle(
		new Request('http://localhost/webhook/stripe', {
			body: '{}',
			headers: { 'content-type': 'application/json' },
			method: 'POST',
		}),
	);

	expect(response.status).toBe(http2Constants.HTTP_STATUS_BAD_REQUEST);
});
