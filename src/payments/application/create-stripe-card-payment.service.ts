import { OrderStatus } from '../../orders/domain/order.types';
import { env } from '../../shared/env.config';
import {
	badGateway,
	paymentRequired,
} from '../../shared/http/http-error.helper';
import { stripeClient } from '../infra/stripe.client';

type StripePaymentIntentClient = {
	paymentIntents: {
		create(input: {
			amount: number;
			currency: string;
			confirm: true;
			metadata: { order_id: string };
			payment_method: string;
			payment_method_types: ['card'];
		}): Promise<{ id: string; status: string }>;
	};
};

export class CreateStripeCardPaymentService {
	constructor(private readonly stripe: StripePaymentIntentClient) {}

	async execute(input: { amount: number; orderId: string }) {
		const paymentIntent = await this.createPaymentIntent(input);

		return {
			status:
				paymentIntent.status === 'succeeded'
					? OrderStatus.Paid
					: OrderStatus.AwaitingPayment,
			stripePaymentIntentId: paymentIntent.id,
		};
	}

	private async createPaymentIntent(input: {
		amount: number;
		orderId: string;
	}) {
		try {
			return await this.stripe.paymentIntents.create({
				amount: input.amount,
				confirm: true,
				currency: env.stripeCurrency,
				metadata: { order_id: input.orderId },
				payment_method: env.stripeTestPaymentMethodId,
				payment_method_types: ['card'],
			});
		} catch (error) {
			if (
				error &&
				typeof error === 'object' &&
				'type' in error &&
				error.type === 'StripeCardError'
			) {
				throw paymentRequired('Card payment was declined');
			}

			throw badGateway('Stripe payment processing failed');
		}
	}
}

export const createStripeCardPaymentService =
	new CreateStripeCardPaymentService(stripeClient);
