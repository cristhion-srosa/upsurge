import { notFound } from '../../shared/http/http-error.helper';
import type { OrderReadModel } from '../infra/order.repository';
import { orderRepository } from '../infra/order.repository';
import { toOrderResponse } from './order-response.presenter';

type QueryOrderRepository = {
	findMany(input: {
		cursor?: string;
		limit: number;
	}): Promise<OrderReadModel[]>;
	findById(id: string): Promise<OrderReadModel | null>;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class ListOrdersUseCase {
	constructor(private readonly repository: QueryOrderRepository) {}

	async execute(input: { cursor?: string; limit?: number }) {
		const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
		const orders = await this.repository.findMany({
			cursor: input.cursor,
			limit,
		});
		const lastOrder = orders.at(-1);

		return {
			data: orders.map(toOrderResponse),
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

		return toOrderResponse(order);
	}
}

export const listOrdersUseCase = new ListOrdersUseCase(orderRepository);
export const getOrderUseCase = new GetOrderUseCase(orderRepository);
