import { EmbedBuilder, Events, WebhookClient, type DateResolvable, type Guild } from 'discord.js';
import type { ExtendedClient } from '../main';
import { getDynamicTime } from '../utils/getDynamicTime';
import { guildModel } from '../models/guild';
import { Logger } from '../utils/logger';

export const event = {
	name: Events.GuildDelete,
	once: false,
	execute: async (guild: Guild, client: ExtendedClient) => {
		const existingGuild = await guildModel.findOne({ guildId: guild.id });
		if (!existingGuild) {
			return;
		}

		await guildModel.deleteOne({ guildId: guild.id });

		try {
			const webhook = new WebhookClient({
				url: Bun.env.GUILD_WEBHOOK_URL!,
			});

			const owner = client.users.cache.get(guild.ownerId);
			const leaveTime = new Date();

			const description = `Name: ${guild.name} (${guild.id})
Owner: ${owner?.username ?? 'Unknown'} (${owner?.id ?? 'Unknown'})
Members: ${guild.memberCount}
Total Guilds: ${client.guilds.cache.size}
Left: ${getDynamicTime(leaveTime, 'LONG_TIME_AND_DATE')} (${getDynamicTime(leaveTime, 'RELATIVE')})`;

			const embed = new EmbedBuilder()
				.setColor('Red')
				.setDescription(description)
				.setAuthor({
					name: guild.name || 'Unknown Server',
					iconURL: guild.iconURL() ?? undefined,
				})
				.setThumbnail(guild.iconURL() ?? null)
				.setTimestamp();

			await webhook.send({
				embeds: [embed],
				username: 'Guild Delete',
				avatarURL: client.user?.displayAvatarURL(),
			});
		} catch (error) {
			Logger.error(`Failed to send guild delete webhook: ${error}`);
		}
	},
};
