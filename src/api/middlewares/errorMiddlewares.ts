import type { Context } from "hono";

export const errorHandler = (err: Error, c: Context) => {
	const message = err.message || "Internal Server Error";

	console.error(err);

	return c.json({
		message,
		error: process.env.NODE_ENV === "development" ? c.error : undefined,
	});
};

export const notFoundHandler = (c: Context) => {
	return c.json({
		message: `Not found - [${c.req.method}] ${c.req.url}`,
	});
};
