import { OrderStatus } from '../../orders/domain/order.types';
import { env } from '../../shared/env.config';
import { stripeClient } from '../infra/stripe.client';

type StripePaymentIntentClient = {
	paymentIntents: {
		create(input: {
			amount: number;
			currency: string;
			confirm: true;
			metadata: { order_id: string };
			payment_method: string;
		}): Promise<{ id: string; status: string }>;
	};
};

export class CreateStripeCardPaymentService {
	constructor(private readonly stripe: StripePaymentIntentClient) {}

	async execute(input: { amount: number; orderId: string }) {
		const paymentIntent = await this.stripe.paymentIntents.create({
			amount: input.amount,
			confirm: true,
			currency: env.stripeCurrency,
			metadata: { order_id: input.orderId },
			payment_method: env.stripeTestPaymentMethodId,
		});

		return {
			status:
				paymentIntent.status === 'succeeded'
					? OrderStatus.Paid
					: OrderStatus.AwaitingPayment,
			stripePaymentIntentId: paymentIntent.id,
		};
	}
}

export const createStripeCardPaymentService =
	new CreateStripeCardPaymentService(stripeClient);
