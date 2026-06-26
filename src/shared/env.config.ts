const requiredEnv = (key: string) => {
	const value = process.env[key];

	if (!value) {
		throw new Error(`${key} is required`);
	}

	return value;
};

const { PORT, REDIS_URL, STRIPE_CURRENCY, STRIPE_TEST_PAYMENT_METHOD_ID } =
	process.env;

export const env = {
	authToken: requiredEnv('AUTH_TOKEN'),
	databaseUrl: requiredEnv('DATABASE_URL'),
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
