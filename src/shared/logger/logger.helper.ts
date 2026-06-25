type LogFields = Record<string, unknown>;

const writeLog = (
	level: 'info' | 'error',
	message: string,
	fields: LogFields = {},
) => {
	const log = {
		level,
		message,
		time: new Date().toISOString(),
		...fields,
	};

	const output = JSON.stringify(log);

	if (level === 'error') {
		console.error(output);
		return;
	}

	console.log(output);
};

export const logger = {
	error: (message: string, fields?: LogFields) =>
		writeLog('error', message, fields),
	info: (message: string, fields?: LogFields) =>
		writeLog('info', message, fields),
};
