import { t } from 'elysia';
import { OrderStatus } from '../../orders/domain/order.types';
import { UUID_PATTERN } from '../../shared/ids.helper';

export const paymentWebhookBodySchema = t.Object({
	event_id: t.String({
		description: 'Gateway event ID',
		minLength: 1,
	}),
	order_id: t.String({
		description: 'Order ID',
		pattern: UUID_PATTERN,
	}),
	status: t.String({
		description: 'Gateway payment status',
		minLength: 1,
	}),
});

export const paymentWebhookResponseSchema = t.Object({
	id: t.String({ description: 'Order ID' }),
	status: t.Union([
		t.Literal(OrderStatus.Pending),
		t.Literal(OrderStatus.AwaitingPayment),
		t.Literal(OrderStatus.Paid),
		t.Literal(OrderStatus.Failed),
	]),
});

export const paymentWebhookOpenApiDetail = {
	description: 'Processes a payment gateway webhook idempotently.',
	summary: 'Process payment webhook',
	tags: ['Webhooks'],
};
