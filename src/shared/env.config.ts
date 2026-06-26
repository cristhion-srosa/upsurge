const requiredEnv = (key: string) => {
	const value = process.env[key];

	if (!value) {
		throw new Error(`${key} is required`);
	}

	return value;
};

const optionalPositiveInt = (key: string, fallback: number) => {
	const value = process.env[key];

	if (!value) {
		return fallback;
	}

	const parsed = Number.parseInt(value, 10);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`${key} must be a positive integer`);
	}

	return parsed;
};

const { PORT, REDIS_URL, STRIPE_CURRENCY, STRIPE_TEST_PAYMENT_METHOD_ID } =
	process.env;

export const env = {
	authToken: requiredEnv('AUTH_TOKEN'),
	databaseUrl: requiredEnv('DATABASE_URL'),
	paymentWebhookJobAttempts: optionalPositiveInt(
		'PAYMENT_WEBHOOK_JOB_ATTEMPTS',
		3,
	),
	paymentWebhookJobBackoffDelayMs: optionalPositiveInt(
		'PAYMENT_WEBHOOK_JOB_BACKOFF_DELAY_MS',
		1000,
	),
	paymentWebhookJobRemoveOnCompleteAgeSeconds: optionalPositiveInt(
		'PAYMENT_WEBHOOK_JOB_REMOVE_ON_COMPLETE_AGE_SECONDS',
		60 * 60 * 24 * 7,
	),
	paymentWebhookJobRemoveOnCompleteCount: optionalPositiveInt(
		'PAYMENT_WEBHOOK_JOB_REMOVE_ON_COMPLETE_COUNT',
		10_000,
	),
	paymentWebhookJobRemoveOnFailAgeSeconds: optionalPositiveInt(
		'PAYMENT_WEBHOOK_JOB_REMOVE_ON_FAIL_AGE_SECONDS',
		60 * 60 * 24 * 30,
	),
	paymentWebhookJobRemoveOnFailCount: optionalPositiveInt(
		'PAYMENT_WEBHOOK_JOB_REMOVE_ON_FAIL_COUNT',
		10_000,
	),
	paymentWebhookWorkerConcurrency: optionalPositiveInt(
		'PAYMENT_WEBHOOK_WORKER_CONCURRENCY',
		5,
	),
	port: Number.parseInt(PORT ?? '3000', 10),
	redisUrl: REDIS_URL ?? 'redis://localhost:6379',
	stripeCurrency: STRIPE_CURRENCY ?? 'brl',
	stripeSecretKey: requiredEnv('STRIPE_SECRET_KEY'),
	stripeTestPaymentMethodId: STRIPE_TEST_PAYMENT_METHOD_ID ?? 'pm_card_visa',
	stripeWebhookSecret: requiredEnv('STRIPE_WEBHOOK_SECRET'),
};

if (!Number.isInteger(env.port) || env.port <= 0) {
	throw new Error('PORT must be a positive integer');
}
