import { expect, test } from 'bun:test';
import { CreateStripeCardPaymentService } from './create-stripe-card-payment.service';

test('CreateStripeCardPaymentService creates and confirms a test PaymentIntent', async () => {
	const calls: unknown[] = [];
	const service = new CreateStripeCardPaymentService({
		paymentIntents: {
			async create(input) {
				calls.push(input);

				return {
					id: 'pi_test_123',
					status: 'succeeded',
				};
			},
		},
	});

	const result = await service.execute({
		amount: 20000,
		orderId: 'order_123',
	});

	expect(result).toEqual({
		status: 'paid',
		stripePaymentIntentId: 'pi_test_123',
	});
	expect(calls).toEqual([
		{
			amount: 20000,
			confirm: true,
			currency: 'brl',
			metadata: { order_id: 'order_123' },
			payment_method: 'pm_card_visa',
			payment_method_types: ['card'],
		},
	]);
});

test('CreateStripeCardPaymentService keeps non-succeeded PaymentIntents awaiting payment', async () => {
	const service = new CreateStripeCardPaymentService({
		paymentIntents: {
			async create() {
				return {
					id: 'pi_test_requires_action',
					status: 'requires_action',
				};
			},
		},
	});

	const result = await service.execute({
		amount: 20000,
		orderId: 'order_123',
	});

	expect(result).toEqual({
		status: 'awaiting_payment',
		stripePaymentIntentId: 'pi_test_requires_action',
	});
});
