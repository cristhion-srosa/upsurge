import { expect, test } from 'bun:test';

import { createId } from './ids.helper';

test('createId returns a UUID v7', () => {
	expect(createId()).toMatch(
		/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
	);
});
