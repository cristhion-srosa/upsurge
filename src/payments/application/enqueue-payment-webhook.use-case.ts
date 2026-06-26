import type { PaymentWebhookQueuePort } from './payment-webhook-queue.port';

export type EnqueuePaymentWebhookInput = {
	eventId: string;
	orderId: string;
	status: string;
};

export class EnqueuePaymentWebhookUseCase {
	constructor(private readonly queue: PaymentWebhookQueuePort) {}

	async execute(input: EnqueuePaymentWebhookInput) {
		await this.queue.enqueue(input);

		return {
			event_id: input.eventId,
			status: 'queued' as const,
		};
	}
}
