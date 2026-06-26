import { t } from 'elysia';

const orderStatusSchema = t.Union([
	t.Literal('pending'),
	t.Literal('awaiting_payment'),
	t.Literal('paid'),
	t.Literal('failed'),
]);

const paymentMethodSchema = t.Union([
	t.Literal('card'),
	t.Literal('boleto'),
	t.Literal('pix'),
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
	}),
});

export const listOrdersQuerySchema = t.Object({
	cursor: t.Optional(
		t.String({ description: 'Cursor returned by the last page' }),
	),
	limit: t.Optional(t.Number({ description: 'Page size' })),
});

export const listOrdersResponseSchema = t.Object({
	data: t.Array(orderResponseSchema),
	next_cursor: t.Union([t.String(), t.Null()]),
});

export const getOrderParamsSchema = t.Object({
	id: t.String({ description: 'Order ID' }),
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
