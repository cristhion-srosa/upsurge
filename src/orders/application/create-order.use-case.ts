import { stripeCardPaymentService } from '../../payments/application/stripe-card-payment.service';
import type { PaymentSimulation } from '../../payments/domain/payment.types';
import { simulatePayment } from '../../payments/domain/payment-simulation.service';
import { Order } from '../domain/order.entity';
import {
	type OrderItemInput,
	type PaymentMethod,
	PaymentMethod as PaymentMethodValue,
} from '../domain/order.types';
import { orderRepository } from '../infra/order.repository';
import { toCreatedOrderResponse } from './order-response.presenter';

type CreateOrderRepository = {
	createWithPayment(order: Order, payment: PaymentSimulation): Promise<void>;
};

type StripeCardPayment = {
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
		private readonly stripeCardPayment: StripeCardPayment,
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

		return toCreatedOrderResponse(order, payment);
	}
}

export const createOrderUseCase = new CreateOrderUseCase(
	orderRepository,
	stripeCardPaymentService,
);
