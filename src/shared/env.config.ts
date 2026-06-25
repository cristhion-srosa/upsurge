const requiredEnv = (key: string) => {
	const value = process.env[key];

	if (!value) {
		throw new Error(`${key} is required`);
	}

	return value;
};

const { PORT } = process.env;

export const env = {
	authToken: requiredEnv('AUTH_TOKEN'),
	databaseUrl: requiredEnv('DATABASE_URL'),
	port: Number.parseInt(PORT ?? '3000', 10),
};

if (!Number.isInteger(env.port) || env.port <= 0) {
	throw new Error('PORT must be a positive integer');
}
