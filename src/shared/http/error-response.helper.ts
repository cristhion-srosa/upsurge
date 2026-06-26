import { constants as http2Constants } from 'node:http2';
import { HttpError } from './http-error.helper';

const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : 'Unknown error';

const errorStatus = (error: unknown) => {
	if (!error || typeof error !== 'object' || !('status' in error)) {
		return http2Constants.HTTP_STATUS_INTERNAL_SERVER_ERROR;
	}

	const { status } = error;

	return typeof status === 'number'
		? status
		: http2Constants.HTTP_STATUS_INTERNAL_SERVER_ERROR;
};

export const isValidationError = (error: unknown) =>
	error &&
	typeof error === 'object' &&
	'code' in error &&
	error.code === 'VALIDATION';

export const toErrorResponse = (error: unknown) => {
	if (error instanceof HttpError) {
		return {
			body: { error: error.message },
			status: error.status,
		};
	}

	const status = errorStatus(error);

	if (isValidationError(error)) {
		return {
			body: { error: 'Invalid request payload' },
			status,
		};
	}

	return {
		body: {
			error:
				status === http2Constants.HTTP_STATUS_INTERNAL_SERVER_ERROR
					? 'Internal server error'
					: errorMessage(error),
		},
		status,
	};
};
