import { Hono } from "hono";
import { Webhook } from "@top-gg/sdk";
import DiscordClient from "../../utils/client";

const voteRoute = new Hono();

const wh = new Webhook(process.env.TOPGG_WEBHOOK_AUTH);

const discordClient = DiscordClient.getInstance();

voteRoute.post(
	"/topgg"
	// TODO: Add custom implementation since @top/sdk doesn't support Hono
);

export default voteRoute;
