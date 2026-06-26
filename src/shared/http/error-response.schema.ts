import { t } from 'elysia';

export const errorResponseSchema = t.Object({
	error: t.Object({
		code: t.String({ description: 'Machine-readable error code' }),
		fields: t.Optional(
			t.Array(
				t.Object({
					message: t.String({ description: 'Field validation error message' }),
					path: t.String({ description: 'Invalid field path' }),
				}),
			),
		),
		message: t.String({ description: 'Human-readable error message' }),
	}),
});
