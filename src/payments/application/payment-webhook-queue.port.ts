export type PaymentWebhookJob = {
	eventId: string;
	orderId: string;
	status: string;
};

export type PaymentWebhookQueuePort = {
	enqueue(input: PaymentWebhookJob): Promise<void>;
};
