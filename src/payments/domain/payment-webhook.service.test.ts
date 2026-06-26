import { expect, test } from 'bun:test';
import {
	mapGatewayPaymentStatus,
	nextPaymentStatus,
} from './payment-webhook.service';

test('mapGatewayPaymentStatus maps gateway statuses to internal statuses', () => {
	expect(mapGatewayPaymentStatus('approved')).toBe('paid');
	expect(mapGatewayPaymentStatus('failed')).toBe('failed');
	expect(mapGatewayPaymentStatus('rejected')).toBe('failed');
	expect(mapGatewayPaymentStatus('expired')).toBe('failed');
});

test('nextPaymentStatus keeps terminal statuses unchanged', () => {
	expect(nextPaymentStatus('awaiting_payment', 'paid')).toBe('paid');
	expect(nextPaymentStatus('awaiting_payment', 'failed')).toBe('failed');
	expect(nextPaymentStatus('paid', 'failed')).toBe('paid');
	expect(nextPaymentStatus('failed', 'paid')).toBe('failed');
});
