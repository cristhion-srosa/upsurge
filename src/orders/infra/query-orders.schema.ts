import { t } from 'elysia';
import { UUID_PATTERN } from '../../shared/ids.helper';
import { OrderStatus, PaymentMethod } from '../domain/order.types';

const orderStatusSchema = t.Union([
	t.Literal(OrderStatus.Pending),
	t.Literal(OrderStatus.AwaitingPayment),
	t.Literal(OrderStatus.Paid),
	t.Literal(OrderStatus.Failed),
]);

const paymentMethodSchema = t.Union([
	t.Literal(PaymentMethod.Card),
	t.Literal(PaymentMethod.Boleto),
	t.Literal(PaymentMethod.Pix),
]);

const orderResponseSchema = t.Object({
	id: t.String({ description: 'Order ID' }),
	customer: t.String({ description: 'Customer name' }),
	status: orderStatusSchema,
	total: t.Integer({ description: 'Order total in cents' }),
	created_at: t.String({ description: 'Order creation timestamp' }),
	items: t.Array(
		t.Object({
			product: t.String({ description: 'Product name' }),
			quantity: t.Integer({ description: 'Item quantity' }),
			price: t.Integer({ description: 'Unit price in cents' }),
			total: t.Integer({ description: 'Item total in cents' }),
		}),
	),
	payment: t.Object({
		method: paymentMethodSchema,
		status: orderStatusSchema,
		boleto_code: t.Optional(t.String()),
		pix_code: t.Optional(t.String()),
		stripe_payment_intent_id: t.Optional(t.String()),
	}),
});

export const listOrdersQuerySchema = t.Object({
	cursor: t.Optional(
		t.String({
			description: 'Cursor returned by the last page',
			pattern: UUID_PATTERN,
		}),
	),
	limit: t.Optional(
		t.Number({
			description: 'Page size',
			maximum: 100,
			minimum: 1,
		}),
	),
});

export const listOrdersResponseSchema = t.Object({
	data: t.Array(orderResponseSchema),
	next_cursor: t.Union([t.String(), t.Null()]),
});

export const getOrderParamsSchema = t.Object({
	id: t.String({ description: 'Order ID', pattern: UUID_PATTERN }),
});

export const getOrderResponseSchema = orderResponseSchema;

export const listOrdersOpenApiDetail = {
	description: 'Lists orders with cursor pagination.',
	summary: 'List orders',
	tags: ['Orders'],
};

export const getOrderOpenApiDetail = {
	description: 'Gets one order with its items and current payment status.',
	summary: 'Get order',
	tags: ['Orders'],
};
