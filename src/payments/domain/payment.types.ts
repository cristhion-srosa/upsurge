import type {
	OrderStatus,
	PaymentMethod,
} from '../../orders/domain/order.types';

export type PaymentSimulation = {
	method: PaymentMethod;
	status: OrderStatus;
	boletoCode?: string;
	pixCode?: string;
	stripePaymentIntentId?: string;
};
