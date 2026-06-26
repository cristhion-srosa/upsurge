import {
	type OrderStatus,
	OrderStatus as OrderStatusValue,
} from '../../orders/domain/order.types';

export class Payment {
	private constructor(public readonly status: OrderStatus) {}

	static withStatus(status: OrderStatus) {
		return new Payment(status);
	}

	applyStatus(incomingStatus: OrderStatus) {
		if (this.isTerminal()) {
			return this;
		}

		return new Payment(incomingStatus);
	}

	isTerminal() {
		return (
			this.status === OrderStatusValue.Paid ||
			this.status === OrderStatusValue.Failed
		);
	}
}
