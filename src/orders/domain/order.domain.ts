export const paymentMethods = ['card', 'boleto', 'pix'] as const;
export const orderStatuses = [
	'pending',
	'awaiting_payment',
	'paid',
	'failed',
] as const;

export type PaymentMethod = (typeof paymentMethods)[number];
export type OrderStatus = (typeof orderStatuses)[number];

export type OrderItemInput = {
	product: string;
	quantity: number;
	price: number;
};

export type OrderItem = OrderItemInput & {
	total: number;
};

export class OrderValidationError extends Error {}

export const createOrderItems = (items: OrderItemInput[]) => {
	if (items.length === 0) {
		throw new OrderValidationError('Order must have at least one item');
	}

	return items.map((item) => {
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
	});
};

export const calculateOrderTotal = (items: OrderItem[]) =>
	items.reduce((total, item) => total + item.total, 0);
