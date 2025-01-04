import { Events, EmbedBuilder, Guild, WebhookClient } from 'discord.js';
import { BOT_NAME, DEFAULT_EMBED_COLOR, DEFAULT_FOOTER } from '../constants';
import type { ColorResolvable, DateResolvable } from 'discord.js';
import type { ExtendedClient } from '../main';
import { guildModel } from '../models/guild';
import { getDynamicTime } from '../utils/getDynamicTime';
import { Logger } from '../utils/logger';

export const event = {
	name: Events.GuildCreate,
	once: false,
	async execute(guild: Guild, client: ExtendedClient) {
		// Check if the guild already exists in database
		const existingGuild = await guildModel.findOne({ guildId: guild.id });

		// If guild exists in DB, this is likely a startup event - skip webhook
		if (existingGuild) {
			return;
		}

		// Create new guild entry
		const newGuild = new guildModel({
			guildId: guild.id,
			name: guild.name,
			icon: guild.iconURL(),
		});

		await newGuild.save();

		// Send welcome message to the guild
		const systemChannel =
			guild.systemChannel ||
			guild.channels.cache.find(
				(channel) => channel.isTextBased() && channel.permissionsFor(guild.members.me!)?.has('SendMessages')
			);

		if (systemChannel?.isTextBased()) {
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
					iconURL: client.user?.displayAvatarURL(),
				});

			await systemChannel.send({ embeds: [embed] });
		}

		try {
			const webhook = new WebhookClient({
				url: Bun.env.GUILD_WEBHOOK_URL!,
			});

			const owner = await guild.fetchOwner();
			const joinTime = new Date();

			const description = `Name: ${guild.name} (${guild.id})
Owner: ${owner.user.username} (${owner.id})
Members: ${guild.memberCount}
Total Guilds: ${client.guilds.cache.size}
Joined: ${getDynamicTime(joinTime, 'LONG_TIME_AND_DATE')} (${getDynamicTime(joinTime, 'RELATIVE')})`;

			const embed = new EmbedBuilder()
				.setColor('Green')
				.setDescription(description)
				.setAuthor({
					name: guild.name,
					iconURL: guild.iconURL() || undefined,
				})
				.setThumbnail(guild.iconURL() ?? null)
				.setTimestamp();

			await webhook.send({
				embeds: [embed],
				username: 'Guild Create',
				avatarURL: client.user?.displayAvatarURL(),
			});
		} catch (error) {
			Logger.error(`Failed to send guild create webhook: ${error}`);
		}
	},
};

export default event;
