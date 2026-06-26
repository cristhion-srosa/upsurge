import { constants as http2Constants } from 'node:http2';
import { Elysia } from 'elysia';
import { requireAuth } from '../../shared/http/auth.middleware';
import { badRequest } from '../../shared/http/http-error.helper';
import { createOrderUseCase } from '../application/create-order.use-case';
import { OrderValidationError } from '../domain/order.errors';
import {
	createOrderBodySchema,
	createOrderOpenApiDetail,
	createOrderResponseSchema,
} from './create-order.schema';

export const ordersRoutes = new Elysia({ prefix: '/orders' })
	.onBeforeHandle(requireAuth)
	.post(
		'/',
		async ({ body, set }) => {
			try {
				const order = await createOrderUseCase.execute({
					customer: body.customer,
					items: body.items,
					paymentMethod: body.payment_method,
				});

				set.status = http2Constants.HTTP_STATUS_CREATED;

				return order;
			} catch (error) {
				if (error instanceof OrderValidationError) {
					throw badRequest(error.message);
				}

				throw error;
			}
		},
		{
			body: createOrderBodySchema,
			detail: createOrderOpenApiDetail,
			response: {
				201: createOrderResponseSchema,
			},
		},
	);
