import { constants as http2Constants } from 'node:http2';

export class HttpError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
	}
}

export const badRequest = (message: string) =>
	new HttpError(http2Constants.HTTP_STATUS_BAD_REQUEST, message);
export const unauthorized = (message = 'Unauthorized') =>
	new HttpError(http2Constants.HTTP_STATUS_UNAUTHORIZED, message);
export const notFound = (message: string) =>
	new HttpError(http2Constants.HTTP_STATUS_NOT_FOUND, message);
export const conflict = (message: string) =>
	new HttpError(http2Constants.HTTP_STATUS_CONFLICT, message);
