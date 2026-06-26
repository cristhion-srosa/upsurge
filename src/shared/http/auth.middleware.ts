import { env } from '../env.config';
import { unauthorized } from './http-error.helper';

type AuthContext = {
	headers: Record<string, string | undefined>;
};

export const requireAuth = ({ headers }: AuthContext) => {
	const { authorization } = headers;
	const token = authorization?.replace(/^Bearer\s+/i, '');

	if (token !== env.authToken) {
		throw unauthorized();
	}

	return undefined;
};
