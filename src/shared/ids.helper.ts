import { v7 as uuidv7 } from 'uuid';

export const UUID_PATTERN =
	'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

const uuidRegex = new RegExp(UUID_PATTERN, 'i');

export const createId = () => uuidv7();

export const isUuid = (value: string) => uuidRegex.test(value);
