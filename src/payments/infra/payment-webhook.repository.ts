import { and, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { orders, payments, paymentWebhookEvents } from '../../db/schema';
import {
	type OrderStatus,
	OrderStatus as OrderStatusValue,
} from '../../orders/domain/order.types';
import { createId } from '../../shared/ids.helper';
import type {
	ProcessPaymentWebhookRepositoryInput,
	ProcessPaymentWebhookResult,
} from '../application/payment-webhook.port';
import { Payment } from '../domain/payment.entity';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class PaymentWebhookRepository {
	async process(
		input: ProcessPaymentWebhookRepositoryInput,
	): Promise<ProcessPaymentWebhookResult | null> {
		return db.transaction(async (transaction) => {
			const existingEvent = await this.findExistingEvent(transaction, input);

			if (existingEvent) {
				const currentOrder = await this.findOrder(
					transaction,
					existingEvent.orderId,
				);

				if (!currentOrder) {
					return null;
				}

				return {
					orderId: existingEvent.orderId,
					status: currentOrder.status,
					duplicate: true,
				};
			}

			const order = await this.findOrder(transaction, input.orderId);

			if (!order) {
				return null;
			}

			const event = await this.insertEvent(transaction, input);

			if (!event) {
				return {
					orderId: input.orderId,
					status: order.status,
					duplicate: true,
				};
			}

			const nextStatus = Payment.withStatus(order.status).applyStatus(
				input.mappedPaymentStatus,
			).status;
			const now = new Date();

			if (nextStatus !== order.status) {
				await this.updateOrderAndPaymentStatus(transaction, {
					currentStatus: order.status,
					nextStatus,
					now,
					orderId: input.orderId,
				});
			}

			return {
				orderId: input.orderId,
				status: nextStatus,
				duplicate: false,
			};
		});
	}

	private async findExistingEvent(
		transaction: Transaction,
		input: Pick<ProcessPaymentWebhookRepositoryInput, 'eventId'>,
	) {
		const [event] = await transaction
			.select({ orderId: paymentWebhookEvents.orderId })
			.from(paymentWebhookEvents)
			.where(eq(paymentWebhookEvents.eventId, input.eventId));

		return event ?? null;
	}

	private async findOrder(transaction: Transaction, orderId: string) {
		const [order] = await transaction
			.select({ id: orders.id, status: orders.status })
			.from(orders)
			.where(eq(orders.id, orderId));

		return order ?? null;
	}

	private async insertEvent(
		transaction: Transaction,
		input: ProcessPaymentWebhookRepositoryInput,
	) {
		const [event] = await transaction
			.insert(paymentWebhookEvents)
			.values({
				id: createId(),
				eventId: input.eventId,
				orderId: input.orderId,
				receivedStatus: input.receivedStatus,
				mappedPaymentStatus: input.mappedPaymentStatus,
				payload: input.payload,
			})
			.onConflictDoNothing()
			.returning({ id: paymentWebhookEvents.id });

		return event ?? null;
	}

	private async updateOrderAndPaymentStatus(
		transaction: Transaction,
		input: {
			currentStatus: OrderStatus;
			nextStatus: OrderStatus;
			now: Date;
			orderId: string;
		},
	) {
		await transaction
			.update(payments)
			.set({
				status: input.nextStatus,
				paidAt: input.nextStatus === OrderStatusValue.Paid ? input.now : null,
				failedAt:
					input.nextStatus === OrderStatusValue.Failed ? input.now : null,
				updatedAt: input.now,
			})
			.where(
				and(
					eq(payments.orderId, input.orderId),
					eq(payments.status, input.currentStatus),
				),
			);

		await transaction
			.update(orders)
			.set({
				status: input.nextStatus,
				updatedAt: input.now,
			})
			.where(eq(orders.id, input.orderId));
	}
}

export const paymentWebhookRepository = new PaymentWebhookRepository();
