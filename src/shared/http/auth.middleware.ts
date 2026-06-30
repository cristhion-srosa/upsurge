import { env } from '../env.config';
import { unauthorized } from './http-error.helper';
import { requestPathname } from './request-url.helper';

type AuthContext = {
	headers?: { authorization?: string };
	request?: Request;
};

const publicPaths = ['/health', '/openapi'];

const isPublicPath = (request?: Request) => {
	if (!request) {
		return false;
	}

	const pathname = requestPathname(request);

	return publicPaths.some(
		(path) => pathname === path || pathname.startsWith(`${path}/`),
	);
};

export const requireAuth = ({ headers, request }: AuthContext) => {
	if (isPublicPath(request)) {
		return undefined;
	}

	const authorization =
		headers?.authorization ?? request?.headers.get('authorization');

	const token = authorization?.replace(/^Bearer\s+/i, '');

	if (token !== env.authToken) {
		throw unauthorized();
	}

	return undefined;
};
