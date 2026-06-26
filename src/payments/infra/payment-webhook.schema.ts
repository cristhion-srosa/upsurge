import { t } from 'elysia';

export const paymentWebhookBodySchema = t.Object({
	event_id: t.String({
		description: 'Gateway event ID',
		minLength: 1,
	}),
	order_id: t.String({
		description: 'Order ID',
	}),
	status: t.String({
		description: 'Gateway payment status',
		minLength: 1,
	}),
});

export const paymentWebhookResponseSchema = t.Object({
	id: t.String({ description: 'Order ID' }),
	status: t.Union([
		t.Literal('pending'),
		t.Literal('awaiting_payment'),
		t.Literal('paid'),
		t.Literal('failed'),
	]),
});

export const paymentWebhookOpenApiDetail = {
	description: 'Processes a payment gateway webhook idempotently.',
	summary: 'Process payment webhook',
	tags: ['Webhooks'],
};
