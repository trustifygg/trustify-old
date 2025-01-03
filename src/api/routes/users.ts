import { Hono } from 'hono';
import { userModel } from '../../models/users';
import { authenticate } from '../middlewares/authMiddlewares';
import { getBotGuilds, getUserGuilds } from '../../utils/discord';
import { refreshUserTokens } from '../../utils/auth';
import type { Variables } from '../..';
import { Logger } from '../../utils/logger';

const usersRoute = new Hono<{ Variables: Variables }>();

usersRoute.get('/@me', authenticate, async (c) => {
	try {
		const user = c.get('user');
		if (!user) {
			return c.json({ message: 'Unauthorized' }, 401);
		}

		const userData = await userModel.findOne({ userId: user.userId });

		if (!userData) {
			return c.json({ message: 'User not found' }, 404);
		}

		const userRes = {
			userId: userData.userId,
			username: userData.username,
			email: userData.email,
			avatar: userData.avatar,
			votes: userData.votes,
		};

		return c.json(userRes, 200);
	} catch (err) {
		Logger.error('Error fetching user:' + err);
		return c.json({ message: 'Internal server error' }, 500);
	}
});

usersRoute.get('/@me/guilds', authenticate, async (c) => {
	try {
		const user = c.get('user');

		if (!user) {
			return c.json({ message: 'Unauthorized' }, 401);
		}

		try {
			const guilds = await getUserGuilds(user.accessToken);

			const MANAGE_GUILD_PERMISSION = BigInt(1) << BigInt(5);
			const managedGuilds = guilds.filter((guild) => {
				const permissions = BigInt(guild.permissions);
				return (permissions & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION;
			});

			const botGuilds = await getBotGuilds(Bun.env.DISCORD_BOT_TOKEN!);
			const botGuildIds = new Set(botGuilds.map((guild) => guild.id));

			const guildsRes = managedGuilds.map((guild) => ({
				id: guild.id,
				name: guild.name,
				icon: guild.icon,
				botPresent: botGuildIds.has(guild.id),
			}));

			return c.json(guildsRes, 200);
		} catch (error: any) {
			if (error.message.includes('401')) {
				try {
					const { user: refreshedUser } = await refreshUserTokens(user, c);
					const guilds = await getUserGuilds(refreshedUser.accessToken);

					const MANAGE_GUILD_PERMISSION = BigInt(1) << BigInt(5);
					const managedGuilds = guilds.filter((guild) => {
						const permissions = BigInt(guild.permissions);
						return (permissions & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION;
					});

					const botGuilds = await getBotGuilds(Bun.env.DISCORD_BOT_TOKEN!);
					const botGuildIds = new Set(botGuilds.map((guild) => guild.id));

					const guildsRes = managedGuilds.map((guild) => ({
						id: guild.id,
						name: guild.name,
						icon: guild.icon,
						botPresent: botGuildIds.has(guild.id),
					}));

					return c.json(guildsRes, 200);
				} catch (refreshError) {
					return c.json({ message: 'Session expired, please login again' }, 401);
				}
			}
			throw error;
		}
	} catch (err) {
		Logger.error('Error fetching user guilds:' + err);
		return c.json({ message: 'Internal server error' }, 500);
	}
});

export default usersRoute;
