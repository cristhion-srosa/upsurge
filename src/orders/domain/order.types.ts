export const PaymentMethod = {
	Card: 'card',
	Boleto: 'boleto',
	Pix: 'pix',
} as const;

export const OrderStatus = {
	Pending: 'pending',
	AwaitingPayment: 'awaiting_payment',
	Paid: 'paid',
	Failed: 'failed',
} as const;

export const paymentMethods = Object.values(PaymentMethod);
export const orderStatuses = Object.values(OrderStatus);

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

export type OrderInput = {
	customer: string;
	items: OrderItemInput[];
	paymentMethod: PaymentMethod;
	status?: OrderStatus;
};
