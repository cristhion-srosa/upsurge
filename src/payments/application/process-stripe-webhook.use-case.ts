import type Stripe from 'stripe';
import { OrderStatus } from '../../orders/domain/order.types';
import { env } from '../../shared/env.config';
import { badRequest, notFound } from '../../shared/http/http-error.helper';
import { paymentWebhookRepository } from '../infra/payment-webhook.repository';
import { stripeClient } from '../infra/stripe.client';
import type { PaymentWebhookRepositoryPort } from './payment-webhook.port';

type StripeWebhookVerifier = {
	webhooks: {
		constructEventAsync(
			payload: string,
			signature: string,
			secret: string,
		): Promise<Stripe.Event>;
	};
};

const stripeEventStatus = (eventType: string) => {
	if (eventType === 'payment_intent.succeeded') {
		return OrderStatus.Paid;
	}

	if (eventType === 'payment_intent.payment_failed') {
		return OrderStatus.Failed;
	}

	return null;
};

export class ProcessStripeWebhookUseCase {
	constructor(
		private readonly stripe: StripeWebhookVerifier,
		private readonly repository: PaymentWebhookRepositoryPort,
	) {}

	async execute(input: { payload: string; signature?: string }) {
		if (!input.signature) {
			throw badRequest('Missing Stripe signature');
		}

		let event: Stripe.Event;

		try {
			event = await this.stripe.webhooks.constructEventAsync(
				input.payload,
				input.signature,
				env.stripeWebhookSecret,
			);
		} catch {
			throw badRequest('Invalid Stripe signature');
		}

		const mappedStatus = stripeEventStatus(event.type);

		if (!mappedStatus) {
			return { received: true };
		}

		const paymentIntent = event.data.object as Stripe.PaymentIntent;
		const { order_id: orderId } = paymentIntent.metadata;

		if (!orderId) {
			throw badRequest('Stripe PaymentIntent metadata.order_id is required');
		}

		const result = await this.repository.process({
			eventId: event.id,
			orderId,
			receivedStatus: event.type,
			mappedPaymentStatus: mappedStatus,
			payload: event as unknown as Record<string, unknown>,
		});

		if (!result) {
			throw notFound('Order not found');
		}

		return {
			id: result.orderId,
			status: result.status,
		};
	}
}

export const processStripeWebhookUseCase = new ProcessStripeWebhookUseCase(
	stripeClient,
	paymentWebhookRepository,
);
