import { defineConfig } from 'drizzle-kit';

const { DATABASE_MIGRATION_URL, DATABASE_URL: APP_DATABASE_URL } = process.env;
const DATABASE_URL = DATABASE_MIGRATION_URL ?? APP_DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL is required');
}

export default defineConfig({
	dbCredentials: {
		url: DATABASE_URL,
	},
	dialect: 'postgresql',
	out: './drizzle',
	schema: './src/db/schema.ts',
});
