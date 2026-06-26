import type { PaymentSimulation } from '../../payments/domain/payment.types';
import { simulatePayment } from '../../payments/domain/payment-simulation.service';
import { Order } from '../domain/order.entity';
import type { OrderItemInput, PaymentMethod } from '../domain/order.types';
import { orderRepository } from '../infra/order.repository';

type CreateOrderRepository = {
	createWithPayment(order: Order, payment: PaymentSimulation): Promise<void>;
};

export type CreateOrderInput = {
	customer: string;
	items: OrderItemInput[];
	paymentMethod: PaymentMethod;
};

export class CreateOrderUseCase {
	constructor(private readonly repository: CreateOrderRepository) {}

	async execute(input: CreateOrderInput) {
		const payment = simulatePayment(input.paymentMethod);
		const order = Order.create({
			customer: input.customer,
			items: input.items,
			paymentMethod: input.paymentMethod,
			status: payment.status,
		});

		await this.repository.createWithPayment(order, payment);

		const paymentResponse = {
			method: payment.method,
			...(payment.boletoCode ? { boleto_code: payment.boletoCode } : {}),
			...(payment.pixCode ? { pix_code: payment.pixCode } : {}),
		};

		return {
			id: order.id,
			status: order.status,
			total: order.total,
			payment: paymentResponse,
		};
	}
}

export const createOrderUseCase = new CreateOrderUseCase(orderRepository);
