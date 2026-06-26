import { badRequest } from '../../shared/http/http-error.helper';
import { isGatewayPaymentStatus } from '../domain/payment-webhook.service';
import type { PaymentWebhookQueuePort } from './payment-webhook-queue.port';

export type EnqueuePaymentWebhookInput = {
	eventId: string;
	orderId: string;
	status: string;
};

export class EnqueuePaymentWebhookUseCase {
	constructor(private readonly queue: PaymentWebhookQueuePort) {}

	async execute(input: EnqueuePaymentWebhookInput) {
		if (!isGatewayPaymentStatus(input.status)) {
			throw badRequest('Invalid payment status');
		}

		await this.queue.enqueue(input);

		return {
			event_id: input.eventId,
			status: 'queued' as const,
		};
	}
}
