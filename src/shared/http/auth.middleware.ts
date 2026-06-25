import { Elysia } from 'elysia';

import { env } from '../env.config';

export const authMiddleware = new Elysia().derive(({ headers, set }) => {
	const { authorization } = headers;
	const token = authorization?.replace(/^Bearer\s+/i, '');

	if (token !== env.authToken) {
		set.status = 401;
		throw new Error('Unauthorized');
	}
});
