import { asc, eq, gt, inArray } from 'drizzle-orm';
import { db } from '../../db/client';
import { orderItems, orders, payments } from '../../db/schema';
import type { PaymentSimulation } from '../../payments/domain/payment.types';
import { createId } from '../../shared/ids.helper';
import type { Order } from '../domain/order.entity';
import {
	type OrderStatus,
	OrderStatus as OrderStatusValue,
	type PaymentMethod,
} from '../domain/order.types';

export type OrderReadModel = {
	id: string;
	customer: string;
	status: OrderStatus;
	total: number;
	createdAt: Date;
	items: {
		product: string;
		quantity: number;
		price: number;
		total: number;
	}[];
	payment: {
		method: PaymentMethod;
		status: OrderStatus;
		boletoCode: string | null;
		pixCode: string | null;
		stripePaymentIntentId: string | null;
	};
};

type FindManyInput = {
	cursor?: string;
	limit: number;
};

export class OrderRepository {
	async createWithPayment(order: Order, payment: PaymentSimulation) {
		await db.transaction(async (transaction) => {
			await transaction.insert(orders).values({
				id: order.id,
				customerName: order.customer,
				status: payment.status,
				totalAmount: order.total,
			});

			await transaction.insert(orderItems).values(
				order.items.map((item) => ({
					id: createId(),
					orderId: order.id,
					productName: item.product,
					quantity: item.quantity,
					unitPrice: item.price,
					totalAmount: item.total,
				})),
			);

			await transaction.insert(payments).values({
				id: createId(),
				orderId: order.id,
				method: payment.method,
				status: payment.status,
				amount: order.total,
				boletoCode: payment.boletoCode,
				pixCode: payment.pixCode,
				stripePaymentIntentId: payment.stripePaymentIntentId,
				paidAt: payment.status === OrderStatusValue.Paid ? new Date() : null,
			});
		});
	}

	async findMany({ cursor, limit }: FindManyInput) {
		const rows = await db
			.select()
			.from(orders)
			.where(cursor ? gt(orders.id, cursor) : undefined)
			.orderBy(asc(orders.id))
			.limit(limit);

		return this.hydrate(rows);
	}

	async findById(id: string) {
		const [row] = await db.select().from(orders).where(eq(orders.id, id));

		if (!row) {
			return null;
		}

		const [order] = await this.hydrate([row]);

		return order ?? null;
	}

	private async hydrate(orderRows: (typeof orders.$inferSelect)[]) {
		if (orderRows.length === 0) {
			return [];
		}

		const orderIds = orderRows.map((order) => order.id);
		const itemRows = await db
			.select()
			.from(orderItems)
			.where(inArray(orderItems.orderId, orderIds))
			.orderBy(asc(orderItems.createdAt), asc(orderItems.id));
		const paymentRows = await db
			.select()
			.from(payments)
			.where(inArray(payments.orderId, orderIds));

		return orderRows.map((order): OrderReadModel => {
			const payment = paymentRows.find((row) => row.orderId === order.id);

			if (!payment) {
				throw new Error(`Payment not found for order ${order.id}`);
			}

			return {
				id: order.id,
				customer: order.customerName,
				status: order.status,
				total: order.totalAmount,
				createdAt: order.createdAt,
				items: itemRows
					.filter((item) => item.orderId === order.id)
					.map((item) => ({
						product: item.productName,
						quantity: item.quantity,
						price: item.unitPrice,
						total: item.totalAmount,
					})),
				payment: {
					method: payment.method,
					status: payment.status,
					boletoCode: payment.boletoCode,
					pixCode: payment.pixCode,
					stripePaymentIntentId: payment.stripePaymentIntentId,
				},
			};
		});
	}
}

export const orderRepository = new OrderRepository();
