import { Hono } from 'hono';
import { Webhook } from '@top-gg/sdk';
import DiscordClient from '../../utils/client';
import type { TopGGWebhook } from '../../types';

const voteRoute = new Hono();

voteRoute.post('/', async (c) => {
	const authKey = c.req.header('Authorization');

	if (authKey !== Bun.env.TOPGG_TOKEN) {
		return c.json({ message: 'Invalid authorization key' }, 401);
	}

	const body: TopGGWebhook = await c.req.json();

	if (body.type !== 'upvote') {
		return c.json({ message: 'Invalid webhook type' }, 400);
	}
});

export default voteRoute;
