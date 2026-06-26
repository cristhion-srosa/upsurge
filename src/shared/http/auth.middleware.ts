import { constants as http2Constants } from 'node:http2';
import { env } from '../env.config';

type AuthContext = {
	headers: Record<string, string | undefined>;
	set: { status?: number | string };
};

export const requireAuth = ({ headers, set }: AuthContext) => {
	const { authorization } = headers;
	const token = authorization?.replace(/^Bearer\s+/i, '');

	if (token !== env.authToken) {
		set.status = http2Constants.HTTP_STATUS_UNAUTHORIZED;

		return { error: 'Unauthorized' };
	}

	return undefined;
};
