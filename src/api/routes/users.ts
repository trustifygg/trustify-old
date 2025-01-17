import { Hono } from "hono";
import { userModel, type IUser } from "../../models/users";
import { authenticate } from "../middlewares/authMiddlewares";
import { getBotGuilds, getUserGuilds } from "../../lib/utils/discord";
import { refreshUserTokens } from "../../lib/utils/auth";
import { manager, type Variables } from "../..";
import { Logger } from "../../lib/utils/logger";
import type { DiscordGuild } from "../../types/discord";
import { hasVoted } from "../../lib/botlist/topgg/hasVoted";

const usersRoute = new Hono<{ Variables: Variables }>();

usersRoute.get("/@me", authenticate, async (c) => {
	try {
		const user = c.get("user");
		if (!user) {
			return c.json({ message: "Unauthorized" }, 401);
		}

		const userData = await userModel.findOne({ userId: user.userId });

		if (!userData) {
			return c.json({ message: "User not found" }, 404);
		}

		const userRes = {
			userId: userData.userId,
			username: userData.username,
			email: userData.email,
			avatar: userData.avatar,
			votedAt: userData.votedAt,
		};

		return c.json(userRes, 200);
	} catch (err) {
		Logger.error("Error fetching user:" + err);
		return c.json({ message: "Internal server error" }, 500);
	}
});

usersRoute.get("/@me/guilds", authenticate, async (c) => {
	try {
		const user = c.get("user");

		if (!user) {
			return c.json({ message: "Unauthorized" }, 401);
		}

		try {
			const guilds = await getUserGuilds(user.accessToken);

			const MANAGE_GUILD_PERMISSION = BigInt(0x20);
			const ADMINISTRATOR_PERMISSION = BigInt(0x8);

			const managedGuilds = guilds.filter((guild: DiscordGuild) => {
				const permissions = BigInt(guild.permissions);
				return Boolean(
					(permissions & MANAGE_GUILD_PERMISSION) === MANAGE_GUILD_PERMISSION ||
						(permissions & ADMINISTRATOR_PERMISSION) ===
							ADMINISTRATOR_PERMISSION
				);
			});

			const botGuilds = (
				await manager.broadcastEval((client) =>
					client.guilds.cache.map((g) => ({
						id: g.id,
						name: g.name,
						icon: g.icon,
					}))
				)
			).flat();

			const botGuildIds = new Set(botGuilds.map((guild) => guild.id));

			const guildsRes = managedGuilds.map((guild: DiscordGuild) => ({
				id: guild.id,
				name: guild.name,
				icon: guild.icon,
				botPresent: botGuildIds.has(guild.id),
			}));

			return c.json(guildsRes, 200);
		} catch (error: any) {
			if (error.message.includes("401")) {
				try {
					const { user: refreshedUser } = await refreshUserTokens(user, c);
					const guilds = await getUserGuilds(refreshedUser.accessToken);

					const MANAGE_GUILD_PERMISSION = BigInt(0x20);
					const ADMINISTRATOR_PERMISSION = BigInt(0x8);

					const managedGuilds = guilds.filter((guild: DiscordGuild) => {
						const permissions = BigInt(guild.permissions);
						return Boolean(
							(permissions & MANAGE_GUILD_PERMISSION) ===
								MANAGE_GUILD_PERMISSION ||
								(permissions & ADMINISTRATOR_PERMISSION) ===
									ADMINISTRATOR_PERMISSION
						);
					});

					const botGuilds = (
						await manager.broadcastEval((client) =>
							client.guilds.cache.map((g) => ({
								id: g.id,
								name: g.name,
								icon: g.icon,
							}))
						)
					).flat();

					const botGuildIds = new Set(botGuilds.map((guild) => guild.id));

					const guildsRes = managedGuilds.map((guild: DiscordGuild) => ({
						id: guild.id,
						name: guild.name,
						icon: guild.icon,
						botPresent: botGuildIds.has(guild.id),
					}));

					return c.json(guildsRes, 200);
				} catch (refreshError) {
					return c.json(
						{ message: "Session expired, please login again" },
						401
					);
				}
			}
			throw error;
		}
	} catch (err) {
		Logger.error("Error fetching user guilds:" + err);
		return c.json({ message: "Internal server error" }, 500);
	}
});

usersRoute.get("/@me/hasVoted", authenticate, async (c) => {
	try {
		const user = c.get("user");

		if (!user) {
			return c.json({ message: "Unauthorized" }, 401);
		}

		const userData = await userModel.findOne({ userId: user.userId });

		if (!userData) {
			return c.json({ message: "User not found" }, 404);
		}

		const checkVoted = await hasVoted(user.userId);

		return c.json({ hasVoted: checkVoted === 1 ? true : false }, 200);
	} catch (err) {
		Logger.error("Error fetching user:" + err);
		return c.json({ message: "Internal server error" }, 500);
	}
});

export default usersRoute;
