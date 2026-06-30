import { expect, test } from 'bun:test';
import { requestPathname } from './request-url.helper';

test('requestPathname supports absolute and relative request URLs', () => {
	expect(requestPathname(new Request('http://localhost/orders?limit=1'))).toBe(
		'/orders',
	);
	expect(requestPathname({ url: '/' } as Request)).toBe('/');
});
