import { createStripeCardPaymentService } from '../../payments/application/create-stripe-card-payment.service';
import type { PaymentSimulation } from '../../payments/domain/payment.types';
import { simulatePayment } from '../../payments/domain/payment-simulation.service';
import { Order } from '../domain/order.entity';
import {
	type OrderItemInput,
	type PaymentMethod,
	PaymentMethod as PaymentMethodValue,
} from '../domain/order.types';
import { orderRepository } from '../infra/order.repository';

type CreateOrderRepository = {
	createWithPayment(order: Order, payment: PaymentSimulation): Promise<void>;
};

type CreateStripeCardPayment = {
	execute(input: {
		amount: number;
		orderId: string;
	}): Promise<Pick<PaymentSimulation, 'status' | 'stripePaymentIntentId'>>;
};

export type CreateOrderInput = {
	customer: string;
	items: OrderItemInput[];
	paymentMethod: PaymentMethod;
};

export class CreateOrderUseCase {
	constructor(
		private readonly repository: CreateOrderRepository,
		private readonly stripeCardPayment: CreateStripeCardPayment,
	) {}

	async execute(input: CreateOrderInput) {
		const simulatedPayment = simulatePayment(input.paymentMethod);
		const order = Order.create({
			customer: input.customer,
			items: input.items,
			paymentMethod: input.paymentMethod,
			status: simulatedPayment.status,
		});
		const payment =
			input.paymentMethod === PaymentMethodValue.Card
				? {
						...simulatedPayment,
						...(await this.stripeCardPayment.execute({
							amount: order.total,
							orderId: order.id,
						})),
					}
				: simulatedPayment;

		await this.repository.createWithPayment(order, payment);

		const paymentResponse = {
			method: payment.method,
			...(payment.boletoCode ? { boleto_code: payment.boletoCode } : {}),
			...(payment.pixCode ? { pix_code: payment.pixCode } : {}),
			...(payment.stripePaymentIntentId
				? { stripe_payment_intent_id: payment.stripePaymentIntentId }
				: {}),
		};

		return {
			id: order.id,
			status: payment.status,
			total: order.total,
			payment: paymentResponse,
		};
	}
}

export const createOrderUseCase = new CreateOrderUseCase(
	orderRepository,
	createStripeCardPaymentService,
);
