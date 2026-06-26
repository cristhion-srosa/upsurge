import { badRequest, notFound } from '../../shared/http/http-error.helper';
import {
	isGatewayPaymentStatus,
	mapGatewayPaymentStatus,
} from '../domain/payment-webhook.service';
import {
	type ProcessPaymentWebhookResult,
	paymentWebhookRepository,
} from '../infra/payment-webhook.repository';

type PaymentWebhookRepositoryPort = {
	process(input: {
		eventId: string;
		orderId: string;
		receivedStatus: string;
		mappedPaymentStatus: 'paid' | 'failed';
		payload: Record<string, unknown>;
	}): Promise<ProcessPaymentWebhookResult | null>;
};

export type ProcessPaymentWebhookInput = {
	eventId: string;
	orderId: string;
	status: string;
};

export class ProcessPaymentWebhookUseCase {
	constructor(private readonly repository: PaymentWebhookRepositoryPort) {}

	async execute(input: ProcessPaymentWebhookInput) {
		if (!isGatewayPaymentStatus(input.status)) {
			throw badRequest('Invalid payment status');
		}

		const result = await this.repository.process({
			eventId: input.eventId,
			orderId: input.orderId,
			receivedStatus: input.status,
			mappedPaymentStatus: mapGatewayPaymentStatus(input.status),
			payload: {
				event_id: input.eventId,
				order_id: input.orderId,
				status: input.status,
			},
		});

		if (!result) {
			throw notFound('Order not found');
		}

		return {
			id: result.orderId,
			status: result.status,
		};
	}
}

export const processPaymentWebhookUseCase = new ProcessPaymentWebhookUseCase(
	paymentWebhookRepository,
);
