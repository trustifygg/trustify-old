import { EmbedBuilder, TextChannel, Client, type ColorResolvable } from 'discord.js';
import { guildModel } from '../models/guild';
import { DEFAULT_EMBED_COLOR } from '../constants';
import { Logger } from '../lib/utils/logger';

let client: Client;

export function setClient(c: Client) {
	client = c;
}

export async function logReview(guildId: string, content: string, color: ColorResolvable = DEFAULT_EMBED_COLOR) {
	const guild = await guildModel.findOne({ guildId });
	if (!guild?.logsChannel) return;

	try {
		const discordGuild = await client.guilds.fetch(guildId);
		const channel = (await discordGuild.channels.fetch(guild.logsChannel)) as TextChannel;

		if (!channel?.isTextBased()) return;

		const embed = new EmbedBuilder().setColor(color).setDescription(content).setTimestamp();

		await channel.send({ embeds: [embed] });
	} catch (error) {
		Logger.error('Failed to send review log:' + error);
	}
}
