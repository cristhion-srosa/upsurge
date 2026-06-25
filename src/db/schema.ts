import { sql } from 'drizzle-orm';
import {
	check,
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
