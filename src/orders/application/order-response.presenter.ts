import type { PaymentSimulation } from '../../payments/domain/payment.types';
import type { Order } from '../domain/order.entity';
import type { OrderReadModel } from '../infra/order.repository';

export const toPaymentResponse = (
	payment: Pick<PaymentSimulation, 'method' | 'status'> & {
		boletoCode?: string | null;
		pixCode?: string | null;
		stripePaymentIntentId?: string | null;
	},
) => ({
	method: payment.method,
	status: payment.status,
	...(payment.boletoCode ? { boleto_code: payment.boletoCode } : {}),
	...(payment.pixCode ? { pix_code: payment.pixCode } : {}),
	...(payment.stripePaymentIntentId
		? { stripe_payment_intent_id: payment.stripePaymentIntentId }
		: {}),
});

export const toCreatedOrderResponse = (
	order: Order,
	payment: PaymentSimulation,
) => {
	const { status: _status, ...paymentResponse } = toPaymentResponse(payment);

	return {
		id: order.id,
		status: payment.status,
		total: order.total,
		payment: paymentResponse,
	};
};

export const toOrderResponse = (order: OrderReadModel) => ({
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
	payment: toPaymentResponse(order.payment),
});
