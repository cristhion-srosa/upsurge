import { Queue, UnrecoverableError, Worker } from 'bullmq';
import { env } from '../../shared/env.config';
import { HttpError } from '../../shared/http/http-error.helper';
import { logger } from '../../shared/logger/logger.helper';
import type {
	PaymentWebhookJob,
	PaymentWebhookQueuePort,
} from '../application/payment-webhook-queue.port';
import { processPaymentWebhookUseCase } from '../application/process-payment-webhook.use-case';

const connection = { url: env.redisUrl };
const paymentWebhookQueueName = 'payment-webhooks';

export class BullMqPaymentWebhookQueue implements PaymentWebhookQueuePort {
	constructor(private readonly queue: Queue<PaymentWebhookJob>) {}

	async enqueue(input: PaymentWebhookJob) {
		await this.queue.add('process-payment-webhook', input, {
			attempts: 3,
			backoff: { delay: 1000, type: 'exponential' },
			jobId: input.eventId,
		});
	}
}

export const paymentWebhookQueue = new Queue<PaymentWebhookJob>(
	paymentWebhookQueueName,
	{ connection },
);

export const bullMqPaymentWebhookQueue = new BullMqPaymentWebhookQueue(
	paymentWebhookQueue,
);

export const startPaymentWebhookWorker = () => {
	const worker = new Worker<PaymentWebhookJob>(
		paymentWebhookQueueName,
		async (job) => {
			try {
				await processPaymentWebhookUseCase.execute(job.data);
			} catch (error) {
				if (error instanceof HttpError && error.status < 500) {
					throw new UnrecoverableError(error.message);
				}

				throw error;
			}
		},
		{ connection },
	);

	worker.on('failed', (job, error) => {
		logger.error('payment_webhook_job_failed', {
			error: error.message,
			eventId: job?.data.eventId,
			jobId: job?.id,
		});
	});

	return worker;
};
