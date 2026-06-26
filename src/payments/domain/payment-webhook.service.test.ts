import { expect, test } from 'bun:test';
import { mapGatewayPaymentStatus } from './payment-webhook.service';

test('mapGatewayPaymentStatus maps gateway statuses to internal statuses', () => {
	expect(mapGatewayPaymentStatus('approved')).toBe('paid');
	expect(mapGatewayPaymentStatus('failed')).toBe('failed');
	expect(mapGatewayPaymentStatus('rejected')).toBe('failed');
	expect(mapGatewayPaymentStatus('expired')).toBe('failed');
});
