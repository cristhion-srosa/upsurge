import type { OrderStatus } from '../../orders/domain/order.types';

export const gatewayPaymentStatuses = [
	'approved',
	'failed',
	'rejected',
	'expired',
] as const;

export type GatewayPaymentStatus = (typeof gatewayPaymentStatuses)[number];

export const isGatewayPaymentStatus = (
	status: string,
): status is GatewayPaymentStatus =>
	gatewayPaymentStatuses.includes(status as GatewayPaymentStatus);

export const mapGatewayPaymentStatus = (
	status: GatewayPaymentStatus,
): 'paid' | 'failed' => (status === 'approved' ? 'paid' : 'failed');

export const nextPaymentStatus = (
	currentStatus: OrderStatus,
	incomingStatus: OrderStatus,
) => {
	if (currentStatus === 'paid' || currentStatus === 'failed') {
		return currentStatus;
	}

	return incomingStatus;
};
