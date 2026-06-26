import { expect, test } from 'bun:test';
import { Payment } from './payment.entity';

test('Payment applies incoming status unless current status is terminal', () => {
	expect(
		Payment.withStatus('awaiting_payment').applyStatus('paid').status,
	).toBe('paid');
	expect(
		Payment.withStatus('awaiting_payment').applyStatus('failed').status,
	).toBe('failed');
	expect(Payment.withStatus('paid').applyStatus('failed').status).toBe('paid');
	expect(Payment.withStatus('failed').applyStatus('paid').status).toBe(
		'failed',
	);
});
