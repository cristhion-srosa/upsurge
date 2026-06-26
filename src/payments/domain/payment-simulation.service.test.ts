import { expect, test } from 'bun:test';

import { simulatePayment } from './payment-simulation.service';

test('simulatePayment approves card payments immediately', () => {
	expect(simulatePayment('card')).toEqual({
		method: 'card',
		status: 'paid',
	});
});

test('simulatePayment creates an awaiting boleto payment with a fake code', () => {
	expect(simulatePayment('boleto')).toEqual({
		method: 'boleto',
		status: 'awaiting_payment',
		boletoCode: 'BOLETO-FAKE-CODE',
	});
});

test('simulatePayment creates an awaiting pix payment with a fake code', () => {
	expect(simulatePayment('pix')).toEqual({
		method: 'pix',
		status: 'awaiting_payment',
		pixCode: 'PIX-FAKE-COPY-PASTE',
	});
});
