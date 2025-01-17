import { Hono } from 'hono';
import type { TopGGWebhook } from '../../types';
import { userModel } from '../../models/users';
import { EmbedBuilder } from 'discord.js';

const voteRoute = new Hono();

voteRoute.post('/topgg', async (c) => {
	const authKey = c.req.header('Authorization');

	if (authKey !== Bun.env.TOPGG_TOKEN) {
		return c.json({ message: 'Invalid authorization key' }, 401);
	}

	const body: TopGGWebhook = await c.req.json();

	// if (body.type !== "upvote") {
	// 	return c.json({ message: "Invalid webhook type" }, 400);
	// }

	console.log('Received webhook:', body);

	await userModel.updateOne({ userId: body.user }, { votedAt: Date.now() }, { upsert: true });

	const embed = new EmbedBuilder().setColor(0xff3366);

	return c.json({ message: 'Success' }, 200);
});

export default voteRoute;
