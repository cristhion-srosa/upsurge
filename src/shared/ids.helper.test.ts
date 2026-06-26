import { expect, test } from 'bun:test';

import { createId, isUuid } from './ids.helper';

test('createId returns a UUID v7', () => {
	expect(createId()).toMatch(
		/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
	);
});

test('isUuid validates UUID strings', () => {
	expect(isUuid('019f04c3-338a-712e-8220-475d87b45a16')).toBe(true);
	expect(isUuid('1k34nm')).toBe(false);
});
