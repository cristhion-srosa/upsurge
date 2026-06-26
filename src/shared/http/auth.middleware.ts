import { env } from '../env.config';
import { unauthorized } from './http-error.helper';

type AuthContext = {
	headers?: { authorization?: string };
	request?: Request;
};

export const requireAuth = ({ headers, request }: AuthContext) => {
	const authorization = headers?.authorization ?? request?.headers.get('authorization');

	const token = authorization?.replace(/^Bearer\s+/i, '');

	if (token !== env.authToken) {
		throw unauthorized();
	}

	return undefined;
};
