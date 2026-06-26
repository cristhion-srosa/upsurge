import type { PaymentMethod } from '../../orders/domain/order.types';
import type { PaymentSimulation } from './payment.types';

export const simulatePayment = (method: PaymentMethod): PaymentSimulation => {
	if (method === 'card') {
		return { method, status: 'paid' };
	}

	if (method === 'boleto') {
		return {
			method,
			status: 'awaiting_payment',
			boletoCode: 'BOLETO-FAKE-CODE',
		};
	}

	return {
		method,
		status: 'awaiting_payment',
		pixCode: 'PIX-FAKE-COPY-PASTE',
	};
};
