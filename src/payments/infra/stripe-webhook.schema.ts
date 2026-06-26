import { t } from 'elysia';
import { OrderStatus } from '../../orders/domain/order.types';

export const stripeWebhookResponseSchema = t.Union([
	t.Object({
		id: t.String({ description: 'Order ID' }),
		status: t.Union([
			t.Literal(OrderStatus.Pending),
			t.Literal(OrderStatus.AwaitingPayment),
			t.Literal(OrderStatus.Paid),
			t.Literal(OrderStatus.Failed),
		]),
	}),
	t.Object({
		received: t.Boolean(),
	}),
]);

export const stripeWebhookOpenApiDetail = {
	description: 'Processes Stripe test mode webhooks with signature validation.',
	summary: 'Process Stripe webhook',
	tags: ['Webhooks'],
};
