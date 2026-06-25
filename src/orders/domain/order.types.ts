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
