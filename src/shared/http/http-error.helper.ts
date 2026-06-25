export class HttpError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
	}
}

export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message = 'Unauthorized') =>
	new HttpError(401, message);
export const notFound = (message: string) => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
