import { and, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { orders, payments, paymentWebhookEvents } from '../../db/schema';
import {
	type OrderStatus,
	OrderStatus as OrderStatusValue,
} from '../../orders/domain/order.types';
import { createId } from '../../shared/ids.helper';
import { nextPaymentStatus } from '../domain/payment-webhook.service';

export type ProcessPaymentWebhookInput = {
	eventId: string;
	orderId: string;
	receivedStatus: string;
	mappedPaymentStatus: OrderStatus;
	payload: Record<string, unknown>;
};

export type ProcessPaymentWebhookResult = {
	orderId: string;
	status: OrderStatus;
	duplicate: boolean;
};

export class PaymentWebhookRepository {
	async process(
		input: ProcessPaymentWebhookInput,
	): Promise<ProcessPaymentWebhookResult | null> {
		return db.transaction(async (transaction) => {
			const [existingEvent] = await transaction
				.select({ orderId: paymentWebhookEvents.orderId })
				.from(paymentWebhookEvents)
				.where(eq(paymentWebhookEvents.eventId, input.eventId));

			if (existingEvent) {
				const [currentOrder] = await transaction
					.select({ status: orders.status })
					.from(orders)
					.where(eq(orders.id, existingEvent.orderId));

				if (!currentOrder) {
					return null;
				}

				return {
					orderId: existingEvent.orderId,
					status: currentOrder.status,
					duplicate: true,
				};
			}

			const [order] = await transaction
				.select({ id: orders.id, status: orders.status })
				.from(orders)
				.where(eq(orders.id, input.orderId));

			if (!order) {
				return null;
			}

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

			if (!event) {
				return {
					orderId: input.orderId,
					status: order.status,
					duplicate: true,
				};
			}

			const nextStatus = nextPaymentStatus(
				order.status,
				input.mappedPaymentStatus,
			);
			const now = new Date();

			if (nextStatus !== order.status) {
				await transaction
					.update(payments)
					.set({
						status: nextStatus,
						paidAt: nextStatus === OrderStatusValue.Paid ? now : null,
						failedAt: nextStatus === OrderStatusValue.Failed ? now : null,
						updatedAt: now,
					})
					.where(
						and(
							eq(payments.orderId, input.orderId),
							eq(payments.status, order.status),
						),
					);

				await transaction
					.update(orders)
					.set({
						status: nextStatus,
						updatedAt: now,
					})
					.where(eq(orders.id, input.orderId));
			}

			return {
				orderId: input.orderId,
				status: nextStatus,
				duplicate: false,
			};
		});
	}
}

export const paymentWebhookRepository = new PaymentWebhookRepository();
