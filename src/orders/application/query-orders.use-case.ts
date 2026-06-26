import { notFound } from '../../shared/http/http-error.helper';
import type { OrderReadModel } from '../infra/order.repository';
import { orderRepository } from '../infra/order.repository';

type QueryOrderRepository = {
	findMany(input: {
		cursor?: string;
		limit: number;
	}): Promise<OrderReadModel[]>;
	findById(id: string): Promise<OrderReadModel | null>;
};

const DEFAULT_LIMIT = 20;

const toResponse = (order: OrderReadModel) => ({
	id: order.id,
	customer: order.customer,
	status: order.status,
	total: order.total,
	created_at: order.createdAt.toISOString(),
	items: order.items.map((item) => ({
		product: item.product,
		quantity: item.quantity,
		price: item.price,
		total: item.total,
	})),
	payment: {
		method: order.payment.method,
		status: order.payment.status,
		...(order.payment.boletoCode
			? { boleto_code: order.payment.boletoCode }
			: {}),
		...(order.payment.pixCode ? { pix_code: order.payment.pixCode } : {}),
		...(order.payment.stripePaymentIntentId
			? { stripe_payment_intent_id: order.payment.stripePaymentIntentId }
			: {}),
	},
});

export class ListOrdersUseCase {
	constructor(private readonly repository: QueryOrderRepository) {}

	async execute(input: { cursor?: string; limit?: number }) {
		const limit = input.limit ?? DEFAULT_LIMIT;
		const orders = await this.repository.findMany({
			cursor: input.cursor,
			limit,
		});
		const lastOrder = orders.at(-1);

		return {
			data: orders.map(toResponse),
			next_cursor: orders.length === limit && lastOrder ? lastOrder.id : null,
		};
	}
}

export class GetOrderUseCase {
	constructor(private readonly repository: QueryOrderRepository) {}

	async execute(id: string) {
		const order = await this.repository.findById(id);

		if (!order) {
			throw notFound('Order not found');
		}

		return toResponse(order);
	}
}

export const listOrdersUseCase = new ListOrdersUseCase(orderRepository);
export const getOrderUseCase = new GetOrderUseCase(orderRepository);
