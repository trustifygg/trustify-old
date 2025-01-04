import { EmbedBuilder, Events, WebhookClient, type DateResolvable, type Guild } from 'discord.js';
import type { ExtendedClient } from '../main';
import { getDynamicTime } from '../utils/getDynamicTime';
import { guildModel } from '../models/guild';

export const event = {
	name: Events.GuildDelete,
	once: false,
	execute: async (guild: Guild, client: ExtendedClient) => {
		await guildModel.deleteOne({ guildId: guild.id });

		const detailedTime = (date: DateResolvable) =>
			`${getDynamicTime(date, 'LONG_TIME_AND_DATE')}  ${getDynamicTime(date, 'RELATIVE')}`;

		const webhook = new WebhookClient({
			url: 'https://discord.com/api/webhooks/1200631483250004078/DHI0tOHmwlG5ADiIjeNLTM4ijBmyKTOZ3woUlLfZkptCA-e8S-qRpm8ifeLOVKBEcntL',
		});

		const owner = client.users.cache.get(guild.ownerId);

		const description = `Name: ${guild.name} (${guild.id})\nOwner: ${
			owner?.username
		} (${owner?.id})\nMembers: ${guild.memberCount}\nTotal Guilds: ${client.guilds.cache.size}\nCreate: ${detailedTime(
			guild.members.me?.joinedAt || new Date()
		)}\nRemove: ${detailedTime(new Date())}
    `;

		const embeds = [
			new EmbedBuilder()
				.setColor('Red')
				.setDescription(description)
				.setAuthor({
					name: guild.name || 'Unknown Server',
					iconURL: guild.iconURL() ?? undefined,
				})
				.setThumbnail(guild.iconURL() ?? null)
				.setTimestamp(),
		];

		const username = 'Guild Delete';
		const avatarURL = guild.client.user.displayAvatarURL();

		webhook.send({ embeds, username, avatarURL }).catch(console.error);
	},
};
