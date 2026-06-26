import { afterEach, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';

import { db } from '../../db/client';
import { orderItems, orders, payments } from '../../db/schema';
import { simulatePayment } from '../../payments/domain/payment-simulation.service';
import { Order } from '../domain/order.entity';
import { orderRepository } from './order.repository';

const createdOrderIds: string[] = [];

afterEach(async () => {
	for (const orderId of createdOrderIds) {
		await db.delete(payments).where(eq(payments.orderId, orderId));
		await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
		await db.delete(orders).where(eq(orders.id, orderId));
	}

	createdOrderIds.length = 0;
});

test('OrderRepository creates order, items, and payment in one transaction', async () => {
	const order = Order.create({
		customer: 'João da Silva',
		items: [{ product: 'Livro de TypeScript', quantity: 2, price: 10000 }],
		paymentMethod: 'pix',
	});
	const payment = simulatePayment(order.paymentMethod);

	createdOrderIds.push(order.id);
	await orderRepository.createWithPayment(order, payment);

	const [savedOrder] = await db
		.select()
		.from(orders)
		.where(eq(orders.id, order.id));
	const savedItems = await db
		.select()
		.from(orderItems)
		.where(eq(orderItems.orderId, order.id));
	const [savedPayment] = await db
		.select()
		.from(payments)
		.where(eq(payments.orderId, order.id));

	expect(savedOrder).toMatchObject({
		customerName: 'João da Silva',
		status: 'awaiting_payment',
		totalAmount: 20000,
	});
	expect(savedItems).toHaveLength(1);
	expect(savedItems[0]).toMatchObject({
		productName: 'Livro de TypeScript',
		quantity: 2,
		unitPrice: 10000,
		totalAmount: 20000,
	});
	expect(savedPayment).toMatchObject({
		method: 'pix',
		status: 'awaiting_payment',
		amount: 20000,
		pixCode: 'PIX-FAKE-COPY-PASTE',
	});
});
