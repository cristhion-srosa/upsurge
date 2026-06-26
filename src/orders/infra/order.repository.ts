import { db } from '../../db/client';
import { orderItems, orders, payments } from '../../db/schema';
import type { PaymentSimulation } from '../../payments/domain/payment.types';
import { createId } from '../../shared/ids.helper';
import type { Order } from '../domain/order.entity';

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
				paidAt: payment.status === 'paid' ? new Date() : null,
			});
		});
	}
}

export const orderRepository = new OrderRepository();
