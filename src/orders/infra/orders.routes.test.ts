import { expect, test } from 'bun:test';
import { constants as http2Constants } from 'node:http2';
import { Elysia } from 'elysia';

import { ordersRoutes } from './orders.routes';

test('ordersRoutes requires authorization', async () => {
	const response = await new Elysia().use(ordersRoutes).handle(
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
