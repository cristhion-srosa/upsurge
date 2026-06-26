import { constants as http2Constants } from 'node:http2';
import { Elysia } from 'elysia';
import { requireAuth } from '../../shared/http/auth.middleware';
import { badRequest } from '../../shared/http/http-error.helper';
import { createOrderUseCase } from '../application/create-order.use-case';
import {
	getOrderUseCase,
	listOrdersUseCase,
} from '../application/query-orders.use-case';
import { OrderValidationError } from '../domain/order.errors';
import {
	createOrderBodySchema,
	createOrderOpenApiDetail,
	createOrderResponseSchema,
} from './create-order.schema';
import {
	getOrderOpenApiDetail,
	getOrderParamsSchema,
	getOrderResponseSchema,
	listOrdersOpenApiDetail,
	listOrdersQuerySchema,
	listOrdersResponseSchema,
} from './query-orders.schema';

export const ordersRoutes = new Elysia({ prefix: '/orders' })
	.onBeforeHandle(requireAuth)
	.get(
		'/',
		async ({ query }) =>
			listOrdersUseCase.execute({
				cursor: query.cursor,
				limit: query.limit,
			}),
		{
			detail: listOrdersOpenApiDetail,
			query: listOrdersQuerySchema,
			response: {
				200: listOrdersResponseSchema,
			},
		},
	)
	.get('/:id', async ({ params }) => getOrderUseCase.execute(params.id), {
		detail: getOrderOpenApiDetail,
		params: getOrderParamsSchema,
		response: {
			200: getOrderResponseSchema,
		},
	})
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
