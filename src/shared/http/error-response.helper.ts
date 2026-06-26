import { constants as http2Constants } from 'node:http2';
import { HttpError } from './http-error.helper';

type ValidationField = {
	path: string;
	message: string;
};

type ValidationValueError = {
	message?: string;
	path?: string;
	schema?: {
		description?: string;
		maximum?: number;
		minimum?: number;
		pattern?: string;
	};
};

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

const errorCode = (message: string) =>
	message
		.replace(/([a-z])([A-Z])/g, '$1_$2')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');

const validationValueError = (error: unknown): ValidationValueError | null => {
	if (!error || typeof error !== 'object' || !('valueError' in error)) {
		return null;
	}

	const { valueError } = error;

	return valueError && typeof valueError === 'object'
		? (valueError as ValidationValueError)
		: null;
};

const fieldPath = (path?: string) =>
	path ? path.replace(/^\//, '').replaceAll('/', '.') : 'request';

const fieldMessage = (field: ValidationValueError) => {
	const name = field.schema?.description ?? fieldPath(field.path);

	if (typeof field.schema?.minimum === 'number') {
		return `Expected ${name} to be greater than or equal to ${field.schema.minimum}`;
	}

	if (typeof field.schema?.maximum === 'number') {
		return `Expected ${name} to be less than or equal to ${field.schema.maximum}`;
	}

	if (field.schema?.pattern) {
		return `Expected ${name} to be a valid value`;
	}

	return field.message ?? 'Invalid value';
};

const validationFields = (error: unknown): ValidationField[] => {
	const field = validationValueError(error);

	if (!field) {
		return [];
	}

	return [
		{
			message: fieldMessage(field),
			path: fieldPath(field.path),
		},
	];
};

export const toErrorResponse = (error: unknown) => {
	if (error instanceof HttpError) {
		return {
			body: {
				error: {
					code: errorCode(error.message),
					message: error.message,
				},
			},
			status: error.status,
		};
	}

	const status = errorStatus(error);

	if (isValidationError(error)) {
		return {
			body: {
				error: {
					code: 'invalid_request',
					fields: validationFields(error),
					message: 'Invalid request payload',
				},
			},
			status,
		};
	}

	const message =
		status === http2Constants.HTTP_STATUS_INTERNAL_SERVER_ERROR
			? 'Internal server error'
			: errorMessage(error);

	return {
		body: {
			error: {
				code: errorCode(message),
				message,
			},
		},
		status,
	};
};
