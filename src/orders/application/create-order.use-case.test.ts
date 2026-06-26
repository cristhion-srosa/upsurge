import { expect, test } from 'bun:test';

import type { PaymentSimulation } from '../../payments/domain/payment.types';
import type { Order } from '../domain/order.entity';
import { CreateOrderUseCase } from './create-order.use-case';

const createUseCase = () => {
	const calls: Array<{ order: Order; payment: PaymentSimulation }> = [];
	const stripeCalls: Array<{ amount: number; orderId: string }> = [];
	const useCase = new CreateOrderUseCase(
		{
			async createWithPayment(order, payment) {
				calls.push({ order, payment });
			},
		},
		{
			async execute(input) {
				stripeCalls.push(input);

				return {
					status: 'paid',
					stripePaymentIntentId: 'pi_test_123',
				};
			},
		},
	);

	return { calls, stripeCalls, useCase };
};

test('CreateOrderUseCase creates a paid card order', async () => {
	const { calls, stripeCalls, useCase } = createUseCase();

	const result = await useCase.execute({
		customer: 'João da Silva',
		items: [{ product: 'Livro de TypeScript', quantity: 2, price: 10000 }],
		paymentMethod: 'card',
	});

	expect(result).toMatchObject({
		status: 'paid',
		total: 20000,
		payment: {
			method: 'card',
			stripe_payment_intent_id: 'pi_test_123',
		},
	});
	expect(result.payment.boleto_code).toBeUndefined();
	expect(result.payment.pix_code).toBeUndefined();
	expect(calls).toHaveLength(1);
	const savedOrder = calls[0]?.order;

	if (!savedOrder) {
		throw new Error('Order was not saved');
	}

	expect(calls[0]?.order.status).toBe('paid');
	expect(calls[0]?.payment.status).toBe('paid');
	expect(calls[0]?.payment.stripePaymentIntentId).toBe('pi_test_123');
	expect(stripeCalls).toEqual([
		{
			amount: 20000,
			orderId: savedOrder.id,
		},
	]);
});

test('CreateOrderUseCase creates an awaiting boleto order with a fake code', async () => {
	const { calls, useCase } = createUseCase();

	const result = await useCase.execute({
		customer: 'João da Silva',
		items: [{ product: 'Livro de TypeScript', quantity: 2, price: 10000 }],
		paymentMethod: 'boleto',
	});

	expect(result).toMatchObject({
		status: 'awaiting_payment',
		total: 20000,
		payment: {
			method: 'boleto',
			boleto_code: 'BOLETO-FAKE-CODE',
		},
	});
	expect(result.payment.pix_code).toBeUndefined();
	expect(calls).toHaveLength(1);
	expect(calls[0]?.order.status).toBe('awaiting_payment');
	expect(calls[0]?.payment.status).toBe('awaiting_payment');
	expect(calls[0]?.payment.stripePaymentIntentId).toBeUndefined();
});

test('CreateOrderUseCase creates an awaiting Pix order with a fake code', async () => {
	const { calls, useCase } = createUseCase();

	const result = await useCase.execute({
		customer: 'João da Silva',
		items: [{ product: 'Livro de TypeScript', quantity: 2, price: 10000 }],
		paymentMethod: 'pix',
	});

	expect(result).toMatchObject({
		status: 'awaiting_payment',
		total: 20000,
		payment: {
			method: 'pix',
			pix_code: 'PIX-FAKE-COPY-PASTE',
		},
	});
	expect(result.payment.boleto_code).toBeUndefined();
	expect(calls).toHaveLength(1);
	expect(calls[0]?.order.status).toBe('awaiting_payment');
	expect(calls[0]?.payment.status).toBe('awaiting_payment');
	expect(calls[0]?.payment.stripePaymentIntentId).toBeUndefined();
});
