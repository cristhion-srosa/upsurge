import { expect, test } from 'bun:test';

import { Order } from './order.entity';
import { OrderValidationError } from './order.errors';

test('Order calculates item totals in cents', () => {
	const order = Order.create([
		{ product: 'Livro de TypeScript', quantity: 2, price: 10000 },
		{ product: 'Frete', quantity: 1, price: 1500 },
	]);

	expect(order.items).toEqual([
		{
			product: 'Livro de TypeScript',
			quantity: 2,
			price: 10000,
			total: 20000,
		},
		{ product: 'Frete', quantity: 1, price: 1500, total: 1500 },
	]);
	expect(order.total).toBe(21500);
});

test('Order rejects invalid items', () => {
	expect(() => Order.create([])).toThrow(OrderValidationError);
	expect(() =>
		Order.create([{ product: '', quantity: 1, price: 1000 }]),
	).toThrow(OrderValidationError);
	expect(() =>
		Order.create([{ product: 'Livro', quantity: 0, price: 1000 }]),
	).toThrow(OrderValidationError);
	expect(() =>
		Order.create([{ product: 'Livro', quantity: 1, price: 10.5 }]),
	).toThrow(OrderValidationError);
});
