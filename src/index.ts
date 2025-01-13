import { ClusterManager, HeartbeatManager } from "discord-hybrid-sharding";
import { Logger } from "./utils/logger";

const isProduction = Bun.env.NODE_ENV === "production";

const startupOptions = !isProduction
	? {
			totalShards: 1,
			shardsPerClusters: 1,
	  }
	: { totalShards: 2, shardsPerClusters: 2 };

export const manager = new ClusterManager("./src/main.ts", {
	...startupOptions,
	mode: "worker",
	token: Bun.env.DISCORD_TOKEN,
});

manager.on("clusterCreate", (cluster) => {
	Logger.info(`[CLUSTER] Cluster ${cluster.id} created`);
	cluster.on("spawn", () =>
		Logger.info(`[CLUSTER] Cluster ${cluster.id} has spawned`)
	);
	cluster.on("death", () =>
		Logger.warn(`[CLUSTER] Cluster${cluster.id} has died`)
	);
	cluster.on("error", (err) => Logger.error(err.message));
});

manager.on("debug", (info) => Logger.debug(`[SHARD_MANAGER] ${info}`));

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
import { MongoStore } from "./utils/mongoStore";
import { connectToDatabase } from "./config/mongodb";
import { config } from "dotenv";
import { postData } from "./utils/botlist";

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

app.get("/", (c) => c.json("Bonjour le monde!"));

app.onError(errorHandler);
app.notFound(notFoundHandler);

manager
	.spawn({ timeout: 10 * 1000 })
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
