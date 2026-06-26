import {
	type OrderStatus,
	OrderStatus as OrderStatusValue,
} from '../../orders/domain/order.types';

export const GatewayPaymentStatus = {
	Approved: 'approved',
	Failed: 'failed',
	Rejected: 'rejected',
	Expired: 'expired',
} as const;

export const gatewayPaymentStatuses = Object.values(GatewayPaymentStatus);

export type GatewayPaymentStatus = (typeof gatewayPaymentStatuses)[number];

export const isGatewayPaymentStatus = (
	status: string,
): status is GatewayPaymentStatus =>
	gatewayPaymentStatuses.includes(status as GatewayPaymentStatus);

export const mapGatewayPaymentStatus = (
	status: GatewayPaymentStatus,
): typeof OrderStatusValue.Paid | typeof OrderStatusValue.Failed =>
	status === GatewayPaymentStatus.Approved
		? OrderStatusValue.Paid
		: OrderStatusValue.Failed;

export const nextPaymentStatus = (
	currentStatus: OrderStatus,
	incomingStatus: OrderStatus,
) => {
	if (
		currentStatus === OrderStatusValue.Paid ||
		currentStatus === OrderStatusValue.Failed
	) {
		return currentStatus;
	}

	return incomingStatus;
};
