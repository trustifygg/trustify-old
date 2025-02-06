import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	PermissionFlagsBits,
	ActionRowBuilder,
	ButtonBuilder,
	TextChannel,
} from 'discord.js';
import { guildModel } from '../models/guild';
import { ERRORS } from '../constants';
import { convertButtonStyle } from '../lib/utils/covertButtonStyle';

export const data = new SlashCommandBuilder()
	.setName('reviewbutton')
	.setDescription('Send a review button in the current channel')
	.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
	const guild = interaction.guild;

	if (!guild) {
		return interaction.reply({
			content: ERRORS.GUILD_ONLY,
			flags: ['Ephemeral'],
		});
	}

	const guildData = await guildModel.findOne({ guildId: guild.id });

	if (!guildData) {
		return interaction.reply({
			content: ERRORS.NEEDS_SETUP,
			flags: ['Ephemeral'],
		});
	}

	const member = await guild.members.fetch(interaction.user.id);
	const hasPermission =
		member.permissions.has(PermissionFlagsBits.Administrator) ||
		guildData.adminRoles?.some((roleId) => member.roles.cache.has(roleId));

	if (!hasPermission) {
		return interaction.reply({
			content: 'You do not have permission to use this command.',
			flags: ['Ephemeral'],
		});
	}

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('submit_review')
			.setLabel(guildData.customReviewButton.label)
			.setStyle(convertButtonStyle(guildData.customReviewButton.color))
	);

	if (!interaction.channel?.isTextBased()) {
		return interaction.reply({
			content: 'This command can only be used in text channels.',
			flags: ['Ephemeral'],
		});
	}

	await (interaction.channel as TextChannel).send({
		components: [row],
	});

	return interaction.reply({
		content: 'Review button has been added!',
		flags: ['Ephemeral'],
	});
}
