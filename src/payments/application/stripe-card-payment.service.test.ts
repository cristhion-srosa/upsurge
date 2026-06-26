import { expect, test } from 'bun:test';
import { constants as http2Constants } from 'node:http2';
import { HttpError } from '../../shared/http/http-error.helper';
import { StripeCardPaymentService } from './stripe-card-payment.service';

test('StripeCardPaymentService creates and confirms a test PaymentIntent', async () => {
	const calls: unknown[] = [];
	const service = new StripeCardPaymentService({
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

test('StripeCardPaymentService keeps non-succeeded PaymentIntents awaiting payment', async () => {
	const service = new StripeCardPaymentService({
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

test('StripeCardPaymentService maps Stripe card declines to payment errors', async () => {
	const service = new StripeCardPaymentService({
		paymentIntents: {
			async create() {
				throw {
					message: 'Your card was declined.',
					type: 'StripeCardError',
				};
			},
		},
	});

	try {
		await service.execute({
			amount: 20000,
			orderId: 'order_123',
		});
		throw new Error('Expected card decline');
	} catch (error) {
		expect(error).toBeInstanceOf(HttpError);
		expect((error as HttpError).status).toBe(
			http2Constants.HTTP_STATUS_PAYMENT_REQUIRED,
		);
		expect((error as Error).message).toBe('Card payment was declined');
	}
});

test('StripeCardPaymentService maps Stripe upstream errors to gateway errors', async () => {
	const service = new StripeCardPaymentService({
		paymentIntents: {
			async create() {
				throw {
					message: 'Stripe is unavailable.',
					type: 'StripeAPIError',
				};
			},
		},
	});

	try {
		await service.execute({
			amount: 20000,
			orderId: 'order_123',
		});
		throw new Error('Expected upstream error');
	} catch (error) {
		expect(error).toBeInstanceOf(HttpError);
		expect((error as HttpError).status).toBe(
			http2Constants.HTTP_STATUS_BAD_GATEWAY,
		);
		expect((error as Error).message).toBe('Stripe payment processing failed');
	}
});
