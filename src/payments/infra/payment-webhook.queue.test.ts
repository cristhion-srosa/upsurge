import { expect, test } from 'bun:test';
import { paymentWebhookJobOptions } from './payment-webhook.queue';

test('paymentWebhookJobOptions uses event ID and retention settings', () => {
	expect(
		paymentWebhookJobOptions({
			eventId: 'evt_queue_options',
			orderId: '019b4601-0588-7000-8000-000000000000',
			status: 'approved',
		}),
	).toEqual({
		attempts: 3,
		backoff: {
			delay: 1000,
			type: 'exponential',
		},
		jobId: 'evt_queue_options',
		removeOnComplete: {
			age: 604800,
			count: 10000,
		},
		removeOnFail: {
			age: 2592000,
			count: 10000,
		},
	});
});
