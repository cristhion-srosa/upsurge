import { expect, test } from 'bun:test';
import { ProcessStripeWebhookUseCase } from './process-stripe-webhook.use-case';

const stripeEventPayload = (input: {
	id?: string;
	orderId?: string;
	type?: string;
}) =>
	JSON.stringify({
		id: input.id ?? 'evt_stripe_123',
		type: input.type ?? 'payment_intent.succeeded',
		data: {
			object: {
				id: 'pi_test_123',
				object: 'payment_intent',
				metadata: input.orderId ? { order_id: input.orderId } : {},
			},
		},
	});

const createUseCase = () => {
	const calls: unknown[] = [];
	const stripe = {
		webhooks: {
			async constructEventAsync(payload: string, signature: string) {
				if (signature !== 'valid_signature') {
					throw new Error('Invalid signature');
				}

				return JSON.parse(payload);
			},
		},
	};
	const repository = {
		async process(input: {
			eventId: string;
			mappedPaymentStatus: 'paid' | 'failed';
			orderId: string;
			payload: Record<string, unknown>;
			receivedStatus: string;
		}) {
			calls.push(input);

			return {
				duplicate: false,
				orderId: input.orderId,
				status: input.mappedPaymentStatus,
			};
		},
	};
	const useCase = new ProcessStripeWebhookUseCase(stripe, repository);

	return { calls, useCase };
};

test('ProcessStripeWebhookUseCase maps successful Stripe payment intents', async () => {
	const { calls, useCase } = createUseCase();

	const result = await useCase.execute({
		payload: stripeEventPayload({ orderId: 'order_123' }),
		signature: 'valid_signature',
	});

	expect(result).toEqual({
		id: 'order_123',
		status: 'paid',
	});
	expect(calls).toMatchObject([
		{
			eventId: 'evt_stripe_123',
			mappedPaymentStatus: 'paid',
			orderId: 'order_123',
			receivedStatus: 'payment_intent.succeeded',
		},
	]);
});

test('ProcessStripeWebhookUseCase maps failed Stripe payment intents', async () => {
	const { calls, useCase } = createUseCase();

	const result = await useCase.execute({
		payload: stripeEventPayload({
			orderId: 'order_123',
			type: 'payment_intent.payment_failed',
		}),
		signature: 'valid_signature',
	});

	expect(result).toEqual({
		id: 'order_123',
		status: 'failed',
	});
	expect(calls).toMatchObject([
		{
			mappedPaymentStatus: 'failed',
			receivedStatus: 'payment_intent.payment_failed',
		},
	]);
});

test('ProcessStripeWebhookUseCase ignores unsupported Stripe events', async () => {
	const { calls, useCase } = createUseCase();

	const result = await useCase.execute({
		payload: stripeEventPayload({
			orderId: 'order_123',
			type: 'payment_intent.created',
		}),
		signature: 'valid_signature',
	});

	expect(result).toEqual({ received: true });
	expect(calls).toEqual([]);
});

test('ProcessStripeWebhookUseCase rejects invalid Stripe signatures', async () => {
	const { useCase } = createUseCase();

	await expect(
		useCase.execute({
			payload: stripeEventPayload({ orderId: 'order_123' }),
			signature: 'invalid_signature',
		}),
	).rejects.toThrow('Invalid Stripe signature');
});

test('ProcessStripeWebhookUseCase requires order ID metadata', async () => {
	const { useCase } = createUseCase();

	await expect(
		useCase.execute({
			payload: stripeEventPayload({}),
			signature: 'valid_signature',
		}),
	).rejects.toThrow('Stripe PaymentIntent metadata.order_id is required');
});
