import { expect, test } from 'bun:test';
import { requireAuth } from './auth.middleware';
import { HttpError } from './http-error.helper';

test('requireAuth skips public documentation and health routes', () => {
	expect(
		requireAuth({
			request: new Request('http://localhost/openapi/json'),
		}),
	).toBeUndefined();
	expect(
		requireAuth({
			request: new Request('http://localhost/health'),
		}),
	).toBeUndefined();
});

test('requireAuth rejects protected routes without token', () => {
	expect(() =>
		requireAuth({
			request: new Request('http://localhost/orders'),
		}),
	).toThrow(HttpError);
});
