import type { Context, Next } from 'hono';
import DiscordClient from '../../utils/client';

const client = DiscordClient.getInstance();

export const hasPermission = async (c: Context, next: Next) => {
	const guildId = c.req.param('guildId');
	const user = c.get('user');

	if (!user) {
		return c.json({ message: 'Unauthorized' }, 401);
	}

	if (!(await client.checkUserPermissions(guildId, user.userId))) {
		return c.json({ message: "You don't have permissions" }, 403);
	}

	return next();
};
