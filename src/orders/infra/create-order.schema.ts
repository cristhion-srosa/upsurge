import { t } from 'elysia';

export const createOrderBodySchema = t.Object({
	customer: t.String({
		description: 'Customer name',
		minLength: 1,
	}),
	items: t.Array(
		t.Object({
			product: t.String({
				description: 'Product name',
				minLength: 1,
			}),
			quantity: t.Integer({
				description: 'Item quantity',
				minimum: 1,
			}),
			price: t.Integer({
				description: 'Unit price in cents',
				minimum: 0,
			}),
		}),
		{
			description: 'Order items',
			minItems: 1,
		},
	),
	payment_method: t.Union(
		[t.Literal('card'), t.Literal('boleto'), t.Literal('pix')],
		{
			description: 'Payment method',
		},
	),
});

export const createOrderResponseSchema = t.Object({
	id: t.String({ description: 'Order ID' }),
	status: t.Union([t.Literal('awaiting_payment'), t.Literal('paid')]),
	total: t.Integer({ description: 'Order total in cents' }),
	payment: t.Object({
		method: t.Union([t.Literal('card'), t.Literal('boleto'), t.Literal('pix')]),
		boleto_code: t.Optional(t.String()),
		pix_code: t.Optional(t.String()),
	}),
});

export const createOrderOpenApiDetail = {
	description: 'Creates an order and simulates its initial payment state.',
	summary: 'Create order',
	tags: ['Orders'],
};
