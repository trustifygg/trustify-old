import {
	EmbedBuilder,
	Events,
	WebhookClient,
	type DateResolvable,
	type Guild,
} from "discord.js";
import type { ExtendedClient } from "../main";
import { getDynamicTime } from "../utils/getDynamicTime";
import { guildModel } from "../models/guild";
import { Logger } from "../utils/logger";

export const event = {
	name: Events.GuildDelete,
	once: false,
	execute: async (guild: Guild, client: ExtendedClient) => {
		try {
			// If guild not found, return
			if (!guild) return;

			// Delete guild data
			await guildModel.deleteOne({ guildId: guild.id });

			// Send webhook
			const webhook = new WebhookClient({
				url: Bun.env.GUILD_WEBHOOK_URL!,
			});

			const owner = await client.users.fetch(guild.ownerId);
			const leaveTime = new Date();

			const description = `Name: ${guild.name} (${guild.id})\nOwner: ${
				owner.username ?? "Unknown"
			} (${owner.id ?? "Unknown"})\nMembers: ${
				guild.memberCount
			}\nTotal Guilds: ${client.guilds.cache.size}\nLeft: ${getDynamicTime(
				leaveTime,
				"LONG_TIME_AND_DATE"
			)} (${getDynamicTime(leaveTime, "RELATIVE")})`;

			const embed = new EmbedBuilder()
				.setColor("Red")
				.setAuthor({
					name: guild.name || "Unknown Server",
					iconURL: guild.iconURL() ?? undefined,
				})
				.setTitle("Guild Deleted")
				.setDescription(description)

				.setThumbnail(guild.iconURL() ?? null)
				.setTimestamp();

			await webhook.send({
				embeds: [embed],
				username: "Guild Delete",
				avatarURL: client.user?.displayAvatarURL(),
			});
		} catch (error) {
			Logger.error(`Failed to send guild delete webhook: ${error}`);
		}
	},
};
