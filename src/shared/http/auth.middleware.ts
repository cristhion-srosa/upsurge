import { Elysia } from 'elysia';

import { env } from '../env.config';
import { unauthorized } from './http-error.helper';

export const authMiddleware = new Elysia().derive(({ headers }) => {
	const { authorization } = headers;
	const token = authorization?.replace(/^Bearer\s+/i, '');

	if (token !== env.authToken) {
		throw unauthorized();
	}
});
