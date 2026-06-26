import { t } from 'elysia';
import { OrderStatus, PaymentMethod } from '../domain/order.types';

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
		[
			t.Literal(PaymentMethod.Card),
			t.Literal(PaymentMethod.Boleto),
			t.Literal(PaymentMethod.Pix),
		],
		{
			description: 'Payment method',
		},
	),
});

export const createOrderResponseSchema = t.Object({
	id: t.String({ description: 'Order ID' }),
	status: t.Union([
		t.Literal(OrderStatus.AwaitingPayment),
		t.Literal(OrderStatus.Paid),
	]),
	total: t.Integer({ description: 'Order total in cents' }),
	payment: t.Object({
		method: t.Union([
			t.Literal(PaymentMethod.Card),
			t.Literal(PaymentMethod.Boleto),
			t.Literal(PaymentMethod.Pix),
		]),
		boleto_code: t.Optional(t.String()),
		pix_code: t.Optional(t.String()),
		stripe_payment_intent_id: t.Optional(t.String()),
	}),
});

export const createOrderOpenApiDetail = {
	description: 'Creates an order and simulates its initial payment state.',
	summary: 'Create order',
	tags: ['Orders'],
};
