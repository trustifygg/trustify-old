import type { Context } from 'hono';
import { Logger } from '../../lib/utils/logger';
import { sendError } from '../../lib/utils/sendError';

export const errorHandler = (err: Error, c: Context) => {
	Logger.error(err);

	return c.json({
		message: err.message,
		error: process.env.NODE_ENV === 'development' ? c.error : undefined,
	});
};

export const notFoundHandler = (c: Context) => {
	return c.json({
		message: `Not found - [${c.req.method}] ${c.req.url}`,
	});
};
