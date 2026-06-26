import {
	OrderStatus,
	type PaymentMethod,
	PaymentMethod as PaymentMethodValue,
} from '../../orders/domain/order.types';
import type { PaymentSimulation } from './payment.types';

export const simulatePayment = (method: PaymentMethod): PaymentSimulation => {
	if (method === PaymentMethodValue.Card) {
		return { method, status: OrderStatus.Paid };
	}

	if (method === PaymentMethodValue.Boleto) {
		return {
			method,
			status: OrderStatus.AwaitingPayment,
			boletoCode: 'BOLETO-FAKE-CODE',
		};
	}

	return {
		method,
		status: OrderStatus.AwaitingPayment,
		pixCode: 'PIX-FAKE-COPY-PASTE',
	};
};
