import { expect, test } from 'bun:test';

import {
	calculateOrderTotal,
	createOrderItems,
	OrderValidationError,
} from './order.domain';

test('createOrderItems calculates item totals in cents', () => {
	const items = createOrderItems([
		{ product: 'Livro de TypeScript', quantity: 2, price: 10000 },
		{ product: 'Frete', quantity: 1, price: 1500 },
	]);

	expect(items).toEqual([
		{
			product: 'Livro de TypeScript',
			quantity: 2,
			price: 10000,
			total: 20000,
		},
		{ product: 'Frete', quantity: 1, price: 1500, total: 1500 },
	]);
	expect(calculateOrderTotal(items)).toBe(21500);
});

test('createOrderItems rejects invalid items', () => {
	expect(() => createOrderItems([])).toThrow(OrderValidationError);
	expect(() =>
		createOrderItems([{ product: '', quantity: 1, price: 1000 }]),
	).toThrow(OrderValidationError);
	expect(() =>
		createOrderItems([{ product: 'Livro', quantity: 0, price: 1000 }]),
	).toThrow(OrderValidationError);
	expect(() =>
		createOrderItems([{ product: 'Livro', quantity: 1, price: 10.5 }]),
	).toThrow(OrderValidationError);
});
