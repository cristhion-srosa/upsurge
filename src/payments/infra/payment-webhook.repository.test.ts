import { afterEach, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import {
	orderItems,
	orders,
	payments,
	paymentWebhookEvents,
} from '../../db/schema';
import { Order } from '../../orders/domain/order.entity';
import { orderRepository } from '../../orders/infra/order.repository';
import { simulatePayment } from '../../payments/domain/payment-simulation.service';
import { paymentWebhookRepository } from './payment-webhook.repository';

const createdOrderIds: string[] = [];

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
		customer: 'João da Silva',
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

test('PaymentWebhookRepository processes duplicate events only once', async () => {
	const order = await createAwaitingOrder();
	const input = {
		eventId: 'evt_duplicate',
		orderId: order.id,
		receivedStatus: 'approved',
		mappedPaymentStatus: 'paid' as const,
		payload: {
			event_id: 'evt_duplicate',
			order_id: order.id,
			status: 'approved',
		},
	};

	const firstResult = await paymentWebhookRepository.process(input);
	const secondResult = await paymentWebhookRepository.process(input);
	const savedEvents = await db
		.select()
		.from(paymentWebhookEvents)
		.where(eq(paymentWebhookEvents.orderId, order.id));
	const [savedPayment] = await db
		.select()
		.from(payments)
		.where(eq(payments.orderId, order.id));

	expect(firstResult).toEqual({
		orderId: order.id,
		status: 'paid',
		duplicate: false,
	});
	expect(secondResult).toEqual({
		orderId: order.id,
		status: 'paid',
		duplicate: true,
	});
	expect(savedEvents).toHaveLength(1);
	expect(savedPayment?.status).toBe('paid');
});

test('PaymentWebhookRepository handles concurrent duplicate events idempotently', async () => {
	const order = await createAwaitingOrder();
	const input = {
		eventId: 'evt_concurrent_duplicate',
		orderId: order.id,
		receivedStatus: 'approved',
		mappedPaymentStatus: 'paid' as const,
		payload: {
			event_id: 'evt_concurrent_duplicate',
			order_id: order.id,
			status: 'approved',
		},
	};

	const results = await Promise.all([
		paymentWebhookRepository.process(input),
		paymentWebhookRepository.process(input),
	]);
	const savedEvents = await db
		.select()
		.from(paymentWebhookEvents)
		.where(eq(paymentWebhookEvents.orderId, order.id));
	const [savedPayment] = await db
		.select()
		.from(payments)
		.where(eq(payments.orderId, order.id));

	expect(results).toContainEqual({
		orderId: order.id,
		status: 'paid',
		duplicate: false,
	});
	expect(results).toContainEqual({
		orderId: order.id,
		status: 'paid',
		duplicate: true,
	});
	expect(savedEvents).toHaveLength(1);
	expect(savedPayment?.status).toBe('paid');
});

test('PaymentWebhookRepository records out-of-order events without changing terminal status', async () => {
	const order = await createAwaitingOrder();

	await paymentWebhookRepository.process({
		eventId: 'evt_paid_first',
		orderId: order.id,
		receivedStatus: 'approved',
		mappedPaymentStatus: 'paid',
		payload: {
			event_id: 'evt_paid_first',
			order_id: order.id,
			status: 'approved',
		},
	});
	const failedResult = await paymentWebhookRepository.process({
		eventId: 'evt_failed_late',
		orderId: order.id,
		receivedStatus: 'failed',
		mappedPaymentStatus: 'failed',
		payload: {
			event_id: 'evt_failed_late',
			order_id: order.id,
			status: 'failed',
		},
	});
	const savedEvents = await db
		.select()
		.from(paymentWebhookEvents)
		.where(eq(paymentWebhookEvents.orderId, order.id));

	expect(failedResult).toEqual({
		orderId: order.id,
		status: 'paid',
		duplicate: false,
	});
	expect(savedEvents).toHaveLength(2);
});

test('PaymentWebhookRepository returns the original order for a duplicated event ID', async () => {
	const firstOrder = await createAwaitingOrder();
	const secondOrder = await createAwaitingOrder();

	await paymentWebhookRepository.process({
		eventId: 'evt_same_gateway_event',
		orderId: firstOrder.id,
		receivedStatus: 'approved',
		mappedPaymentStatus: 'paid',
		payload: {
			event_id: 'evt_same_gateway_event',
			order_id: firstOrder.id,
			status: 'approved',
		},
	});
	const duplicateResult = await paymentWebhookRepository.process({
		eventId: 'evt_same_gateway_event',
		orderId: secondOrder.id,
		receivedStatus: 'failed',
		mappedPaymentStatus: 'failed',
		payload: {
			event_id: 'evt_same_gateway_event',
			order_id: secondOrder.id,
			status: 'failed',
		},
	});

	expect(duplicateResult).toEqual({
		orderId: firstOrder.id,
		status: 'paid',
		duplicate: true,
	});
});

test('PaymentWebhookRepository returns null when the order does not exist', async () => {
	const result = await paymentWebhookRepository.process({
		eventId: 'evt_missing_order',
		orderId: '019b4601-0588-7000-8000-000000000000',
		receivedStatus: 'approved',
		mappedPaymentStatus: 'paid',
		payload: {
			event_id: 'evt_missing_order',
			order_id: '019b4601-0588-7000-8000-000000000000',
			status: 'approved',
		},
	});

	expect(result).toBeNull();
});
