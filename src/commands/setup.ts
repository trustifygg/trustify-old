import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
	type ColorResolvable,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ApplicationIntegrationType,
} from "discord.js";
import { guildModel } from "../models/guild";
import {
	DEFAULT_EMBED_COLOR,
	DEFAULT_FOOTER,
	ERRORS,
	BOT_NAME,
} from "../constants";
import { logReview } from "../events/reviewLog";

export const data = new SlashCommandBuilder()
	.setName("setup")
	.setDescription("Setup server review settings")
	.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
	.setIntegrationTypes(ApplicationIntegrationType.GuildInstall);

export async function execute(interaction: ChatInputCommandInteraction) {
	const embed = new EmbedBuilder()
		.setColor(DEFAULT_EMBED_COLOR)
		.setTitle("How to setup Trustify?")
		.setDescription(
			"To setup Trustify, you need to go the [dashboard](https://www.trustify.gg/dashboard) and select your server. You can configure your server settings there and the appearance of the bot."
		)

		.setFooter({
			text: DEFAULT_FOOTER,
			iconURL: interaction.client.user.displayAvatarURL(),
		});

	return interaction.reply({
		embeds: [embed],
		components: [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setLabel("Go to Dashboard")
					.setEmoji("🌐")
					.setStyle(ButtonStyle.Link)
					.setURL("https://www.trustify.gg/dashboard")
			),
		],
	});
}
