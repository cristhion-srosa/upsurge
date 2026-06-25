import { expect, test } from 'bun:test';

import { Order } from './order.entity';
import { OrderValidationError } from './order.errors';

test('Order creates a pending order with calculated totals in cents', () => {
	const order = Order.create({
		customer: ' João da Silva ',
		items: [
			{ product: 'Livro de TypeScript', quantity: 2, price: 10000 },
			{ product: 'Frete', quantity: 1, price: 1500 },
		],
		paymentMethod: 'pix',
	});

	expect(order.id).toMatch(
		/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
	);
	expect(order.customer).toBe('João da Silva');
	expect(order.paymentMethod).toBe('pix');
	expect(order.status).toBe('pending');
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

test('Order rejects invalid input', () => {
	expect(() =>
		Order.create({ customer: '', items: [], paymentMethod: 'pix' }),
	).toThrow(OrderValidationError);
	expect(() =>
		Order.create({
			customer: 'João',
			items: [{ product: 'Livro', quantity: 1, price: 1000 }],
			paymentMethod: 'pix',
			status: 'refunded' as never,
		}),
	).toThrow(OrderValidationError);
	expect(() =>
		Order.create({
			customer: 'João',
			items: [],
			paymentMethod: 'pix',
		}),
	).toThrow(OrderValidationError);
	expect(() =>
		Order.create({
			customer: 'João',
			items: [{ product: '', quantity: 1, price: 1000 }],
			paymentMethod: 'pix',
		}),
	).toThrow(OrderValidationError);
	expect(() =>
		Order.create({
			customer: 'João',
			items: [{ product: 'Livro', quantity: 0, price: 1000 }],
			paymentMethod: 'pix',
		}),
	).toThrow(OrderValidationError);
	expect(() =>
		Order.create({
			customer: 'João',
			items: [{ product: 'Livro', quantity: 1, price: 10.5 }],
			paymentMethod: 'pix',
		}),
	).toThrow(OrderValidationError);
});
