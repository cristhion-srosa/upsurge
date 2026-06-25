import { sql } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';

export const orderStatus = pgEnum('order_status', [
	'pending',
	'awaiting_payment',
	'paid',
	'failed',
]);

export const paymentMethod = pgEnum('payment_method', [
	'card',
	'boleto',
	'pix',
]);

export const paymentStatus = pgEnum('payment_status', [
	'pending',
	'awaiting_payment',
	'paid',
	'failed',
]);

export const orders = pgTable(
	'orders',
	{
		id: uuid('id').primaryKey(),
		customerName: text('customer_name').notNull(),
		status: orderStatus('status').notNull().default('pending'),
		totalAmount: integer('total_amount').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		check(
			'orders_id_uuid_v7_check',
			sql`${table.id}::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'`,
		),
		check(
			'orders_total_amount_non_negative_check',
			sql`${table.totalAmount} >= 0`,
		),
	],
);

export const orderItems = pgTable(
	'order_items',
	{
		id: uuid('id').primaryKey(),
		orderId: uuid('order_id')
			.notNull()
			.references(() => orders.id),
		productName: text('product_name').notNull(),
		quantity: integer('quantity').notNull(),
		unitPrice: integer('unit_price').notNull(),
		totalAmount: integer('total_amount').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index('order_items_order_id_idx').on(table.orderId),
		check(
			'order_items_id_uuid_v7_check',
			sql`${table.id}::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'`,
		),
		check('order_items_quantity_positive_check', sql`${table.quantity} > 0`),
		check(
			'order_items_unit_price_non_negative_check',
			sql`${table.unitPrice} >= 0`,
		),
		check(
			'order_items_total_amount_check',
			sql`${table.totalAmount} = ${table.quantity} * ${table.unitPrice}`,
		),
	],
);

export const payments = pgTable(
	'payments',
	{
		id: uuid('id').primaryKey(),
		orderId: uuid('order_id')
			.notNull()
			.references(() => orders.id),
		method: paymentMethod('method').notNull(),
		status: paymentStatus('status').notNull().default('pending'),
		amount: integer('amount').notNull(),
		boletoCode: text('boleto_code'),
		pixCode: text('pix_code'),
		paidAt: timestamp('paid_at', { withTimezone: true }),
		failedAt: timestamp('failed_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex('payments_order_id_unique_idx').on(table.orderId),
		check(
			'payments_id_uuid_v7_check',
			sql`${table.id}::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'`,
		),
		check('payments_amount_non_negative_check', sql`${table.amount} >= 0`),
	],
);
