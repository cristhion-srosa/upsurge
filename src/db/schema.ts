import { sql } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core';

export const orderStatus = pgEnum('order_status', [
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
