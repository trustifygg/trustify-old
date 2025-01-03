import { config } from 'dotenv';
import { Client, GatewayIntentBits, Collection, ChatInputCommandInteraction } from 'discord.js';
import { connectToDatabase } from './config/mongodb';
import fs from 'fs';
import path from 'path';
import { setClient } from './events/reviewLog';
import { createReviewModal, handleUsefulButton } from './components/reviewButtons';
import { requireSetup } from './utils/checkSetup';
import { Logger } from './utils/logger';

config();
connectToDatabase();

app
	.use(logger())
	.use(secureHeaders())
	.use(
		cors({
			origin: process.env.WEBSITE_URL || "http://localhost:3000",
			credentials: true,
			allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
			allowHeaders: ["Content-Type", "Authorization"],
		})
	)
	.use(
		rateLimiter({
			windowMs: 15 * 60 * 1000,
			limit: 100,
			keyGenerator: (c: any) => "test",
		})
	)
	.use(
		"*",
		sessionMiddleware({
			store: new MongoStore(),
			encryptionKey: Bun.env.SESSION_SECRET!,
			expireAfterSeconds: 604800,
			cookieOptions: {
				secure: process.env.NODE_ENV === "production",
				maxAge: 604800,
				sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
				path: "/",
				httpOnly: true,
				domain:
					process.env.NODE_ENV === "production"
						? process.env.WEBSITE_URL
						: undefined,
			},
		})
	)
	.get("/", (c) => c.json("Bonjour le monde!"))
	.onError(errorHandler)
	.notFound(notFoundHandler);

const routesPath = path.join(__dirname, "api", "routes");
const routeFiles = readdirSync(routesPath).filter((file) =>
	file.endsWith(".ts")
);

routeFiles.forEach((file) => {
	const routeName = file.split(".")[0];
	const router = require(path.join(routesPath, file)).default;
	app.route(routeName, router);
  Logger.info(`Route loaded: ${routeName}`);
});

manager
	.spawn({ timeout: 10 * 1000 })
	.then(() => Logger.info("All shards are running"))
	.catch((err) => Logger.error(err));

export default {
	port: PORT,
	fetch: app.fetch,
};
