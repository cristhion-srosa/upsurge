import type { OrderStatus } from '../../orders/domain/order.types';

export type ProcessPaymentWebhookRepositoryInput = {
	eventId: string;
	orderId: string;
	receivedStatus: string;
	mappedPaymentStatus: OrderStatus;
	payload: Record<string, unknown>;
};

export type ProcessPaymentWebhookResult = {
	orderId: string;
	status: OrderStatus;
	duplicate: boolean;
};

export type PaymentWebhookRepositoryPort = {
	process(
		input: ProcessPaymentWebhookRepositoryInput,
	): Promise<ProcessPaymentWebhookResult | null>;
};
