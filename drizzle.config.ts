import { defineConfig } from 'drizzle-kit';

const DATABASE_URL =
	process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

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
