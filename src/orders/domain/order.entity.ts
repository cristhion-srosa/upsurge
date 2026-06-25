import { OrderValidationError } from './order.errors';
import type { OrderItem, OrderItemInput } from './order.types';

export class Order {
	private constructor(public readonly items: OrderItem[]) {}

	static create(items: OrderItemInput[]) {
		if (items.length === 0) {
			throw new OrderValidationError('Order must have at least one item');
		}

		return new Order(items.map((item) => Order.createItem(item)));
	}

	get total() {
		return this.items.reduce((total, item) => total + item.total, 0);
	}

	private static createItem(item: OrderItemInput) {
		if (item.product.trim().length === 0) {
			throw new OrderValidationError('Item product is required');
		}

		if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
			throw new OrderValidationError(
				'Item quantity must be a positive integer',
			);
		}

		if (!Number.isInteger(item.price) || item.price < 0) {
			throw new OrderValidationError(
				'Item price must be a non-negative integer',
			);
		}

		return {
			...item,
			product: item.product.trim(),
			total: item.quantity * item.price,
		};
	}
}
