import { Events, EmbedBuilder, Guild, WebhookClient } from 'discord.js';
import { BOT_NAME, DEFAULT_EMBED_COLOR, DEFAULT_FOOTER } from '../constants';
import type { ColorResolvable, DateResolvable } from 'discord.js';
import type { ExtendedClient } from '../main';
import { guildModel } from '../models/guild';
import { getDynamicTime } from '../utils/getDynamicTime';

export const event = {
	name: Events.GuildCreate,
	once: false,
	async execute(guild: Guild, client: ExtendedClient) {
		const systemChannel =
			guild.systemChannel ||
			guild.channels.cache.find(
				(channel) => channel.isTextBased() && channel.permissionsFor(guild.members.me!)?.has('SendMessages')
			);

		if (!systemChannel?.isTextBased()) return;

		const embed = new EmbedBuilder()
			.setColor(DEFAULT_EMBED_COLOR as ColorResolvable)
			.setTitle('Thanks for adding Reviews.')
			.setDescription('To get started, please run the `/setup` command to configure your server.')
			.addFields(
				{
					name: '⚙️ First Steps',
					value:
						'1. Use `/setup` to configure Reviews settings\n2. Set up review channels and roles\n3. Customize Reviews appearance',
					inline: false,
				},
				{
					name: '🔑 Important',
					value: 'No commands will work until the initial setup is complete.',
					inline: false,
				}
			)
			.setFooter({
				text: DEFAULT_FOOTER,
				iconURL: guild.client.user.displayAvatarURL(),
			});

		await systemChannel.send({ embeds: [embed] });

		const data = await guildModel.findOne({ guildId: guild.id });

		if (!data) {
			const newGuild = new guildModel({
				guildId: guild.id,
			});

			await newGuild.save();
		}

		const detailedTime = (date: DateResolvable) =>
			`${getDynamicTime(date, 'LONG_TIME_AND_DATE')}  ${getDynamicTime(date, 'RELATIVE')}`;

		const webhook = new WebhookClient({
			url: 'https://discord.com/api/webhooks/1200631483250004078/DHI0tOHmwlG5ADiIjeNLTM4ijBmyKTOZ3woUlLfZkptCA-e8S-qRpm8ifeLOVKBEcntL',
		});

		const owner = await guild.fetchOwner();

		const description = `Name: ${guild.name} (${guild.id})\nOwner: ${
			owner.user.username
		} (${owner.id})\nMembers: ${guild.memberCount}\nTotal Guilds: ${client.guilds.cache.size}\nCreate: ${detailedTime(
			guild.members.me?.joinedAt || new Date()
		)}\nRemove: ❌
				`;

		const embeds = [
			new EmbedBuilder()
				.setColor('Green')
				.setDescription(description)
				.setAuthor({ name: guild.name, iconURL: guild.iconURL() || undefined })
				.setThumbnail(guild.iconURL() ?? null)
				.setTimestamp(),
		];

		const username = 'Guild Create';
		const avatarURL = guild.client.user.displayAvatarURL();

		await webhook.send({ embeds, username, avatarURL }).catch(console.error);
	},
};

export default event;
