import {
	Events,
	EmbedBuilder,
	Guild,
	WebhookClient,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from "discord.js";
import { DEFAULT_EMBED_COLOR, DEFAULT_FOOTER } from "../constants";
import type { ColorResolvable } from "discord.js";
import type { ExtendedClient } from "../main";
import { guildModel } from "../models/guild";
import { getDynamicTime } from "../lib/utils/utils";
import { Logger } from "../lib/utils/logger";

export const event = {
	name: Events.GuildCreate,
	once: false,
	async execute(guild: Guild, client: ExtendedClient) {
		try {
			// Fetch guild data
			const guildData = await guildModel.findOne({ guildId: guild.id });

			// If guild data not found, create it
			if (!guildData) {
				const newGuild = new guildModel({
					guildId: guild.id,
					name: guild.name,
					iconURL: guild.iconURL(),
				});

				await newGuild.save();
			}

			// Send webhook
			const webhook = new WebhookClient({
				url: Bun.env.GUILD_WEBHOOK_URL!,
			});

			const owner = await guild.fetchOwner();
			const joinTime = new Date();

			const description = `Name: ${guild.name} (${guild.id})\nOwner: ${
				owner.user.username
			} (${owner.id})\nMembers: ${guild.memberCount}\nTotal Guilds: ${
				client.guilds.cache.size
			}\nJoined: ${getDynamicTime(
				joinTime,
				"LONG_TIME_AND_DATE"
			)} (${getDynamicTime(joinTime, "RELATIVE")})`;

			const embed = new EmbedBuilder()
				.setColor("Green")
				.setAuthor({
					name: guild.name,
					iconURL: guild.iconURL() || undefined,
				})
				.setTitle("Guild Joined")
				.setDescription(description)

				.setThumbnail(guild.iconURL() ?? null)
				.setTimestamp();

			await webhook.send({
				embeds: [embed],
				username: "Guild Create",
				avatarURL: client.user?.displayAvatarURL(),
			});

			// Send welcome message to the guild
			const systemChannel =
				guild.systemChannel ||
				guild.channels.cache.find(
					(channel) =>
						channel.isTextBased() &&
						channel.permissionsFor(guild.members.me!)?.has("SendMessages")
				);

			if (systemChannel?.isTextBased()) {
				const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
					new ButtonBuilder()
						.setLabel("Go to Dashboard")
						.setStyle(ButtonStyle.Link)
						.setURL(`https://www.trustify.gg/dashboard/${guild.id}`)
						.setEmoji("🌐"),
					new ButtonBuilder()
						.setLabel("Support Server")
						.setStyle(ButtonStyle.Link)
						.setURL("https://discord.gg/APa6ur9yqj")
						.setEmoji("🏠")
				);
				const embed = new EmbedBuilder()
					.setColor(DEFAULT_EMBED_COLOR as ColorResolvable)
					.setTitle("Thanks for choosing Trustify!")
					.setDescription(
						`To get started, please run the \`/setup\` command or [visit the dashboard](https://www.trustify.gg/dashboard/${guild.id}) to configure your server.\n\nTo view all the commands, use the \`/help\` command.`
					)
					.setFooter({
						text: DEFAULT_FOOTER,
						iconURL: client.user?.displayAvatarURL(),
					});

				await systemChannel.send({ embeds: [embed], components: [row] });
			}
		} catch (error) {
			Logger.error(`Failed to send guild create webhook: ${error}`);
		}
	},
};

export default event;
