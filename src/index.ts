import { ClusterManager } from "discord-hybrid-sharding";
import { Logger } from "./lib/utils/logger";

const isProduction = Bun.env.NODE_ENV === "production";

export const manager = new ShardingManager("./src/main.ts", {
	token: Bun.env.DISCORD_TOKEN!,
	totalShards: "auto",
	respawn: true,
});

manager.on("shardCreate", (shard) => {
	Logger.info(`Launched shard ${shard.id}`);

	shard.on("message", (message) => {
		Logger.info(message);
	});

	shard.on("ready", () => {
		Logger.info(`Shard ${shard.id} is ready`);
	});

	shard.on("error", (error) => {
		Logger.error("Sharding manager error: ", error);
	});

	shard.on("disconnect", () => {
		Logger.warn(`Disconnected from shard ${shard.id}`);
	});

	shard.on("reconnecting", () => {
		Logger.warn(`Reconnecting to shard ${shard.id}`);
	});
});

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import path from "path";
import { readdirSync } from "fs";
import { type IUser } from "./models/users";
import { type SessionData } from "./types/session";
import { rateLimiter } from "hono-rate-limiter";
import { sessionMiddleware } from "hono-sessions";
import {
	errorHandler,
	notFoundHandler,
} from "./api/middlewares/errorMiddlewares";
import { MongoStore } from "./lib/utils/mongoStore";
import { connectToDatabase } from "./lib/config/mongodb";
import { config } from "dotenv";
import { postData } from "./lib/botlist/postData";
import { ShardingManager } from "discord.js";

config();
connectToDatabase();

export type Variables = {
	user?: IUser;
	session: SessionData;
};

const app = new Hono<{ Variables: Variables }>().basePath("/v1");
const PORT = Bun.env.PORT || 5000;

app
	.use(logger())
	.use(secureHeaders())
	.use(
		cors({
			origin:
				process.env.NODE_ENV === "production"
					? ["https://trustify.gg", "https://www.trustify.gg"]
					: "http://localhost:3000",
			credentials: true,
			allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
			allowHeaders: ["Content-Type", "Authorization"],
		})
	)
	.use(
		rateLimiter({
			windowMs: 15 * 60 * 1000,
			limit: 150,
			keyGenerator: (c: any) => "global",
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
	);

const routesPath = path.join(__dirname, "api", "routes");
const routeFiles = readdirSync(routesPath).filter((file) =>
	file.endsWith(".ts")
);

routeFiles.forEach((file) => {
	const routeName = file.split(".")[0];
	const router = require(path.join(routesPath, file)).default;
	app.route(routeName, router);
	Logger.info(`[API] Route loaded: ${routeName}`);
});

app.get("/", (c) => c.text("💙"));

app.onError(errorHandler);
app.notFound(notFoundHandler);

manager
	.spawn({ amount: "auto", delay: 5000, timeout: 10 * 1000 })
	.then(() => {
		Logger.info("All shards are running");

		if (isProduction) {
			postData(manager);
		}
	})
	.catch((err) => Logger.error(err));

export default {
	port: PORT,
	fetch: app.fetch,
};
