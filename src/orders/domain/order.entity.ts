import { createId } from '../../shared/ids.helper';
import { OrderValidationError } from './order.errors';
import type {
	OrderInput,
	OrderItem,
	OrderItemInput,
	OrderStatus,
	PaymentMethod,
} from './order.types';
import {
	OrderStatus as OrderStatusValue,
	orderStatuses,
	paymentMethods,
} from './order.types';

export class Order {
	readonly total: number;

	private constructor(
		public readonly id: string,
		public readonly customer: string,
		public readonly items: OrderItem[],
		public readonly paymentMethod: PaymentMethod,
		public readonly status: OrderStatus,
	) {
		this.total = items.reduce((total, item) => total + item.total, 0);
	}

	static create(input: OrderInput) {
		const customer = input.customer.trim();

		if (customer.length === 0) {
			throw new OrderValidationError('Order customer is required');
		}

		if (!paymentMethods.includes(input.paymentMethod)) {
			throw new OrderValidationError('Invalid payment method');
		}

		if (input.status && !orderStatuses.includes(input.status)) {
			throw new OrderValidationError('Invalid order status');
		}

		if (input.items.length === 0) {
			throw new OrderValidationError('Order must have at least one item');
		}

		return new Order(
			createId(),
			customer,
			input.items.map((item) => Order.createItem(item)),
			input.paymentMethod,
			input.status ?? OrderStatusValue.Pending,
		);
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
