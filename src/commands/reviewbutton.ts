import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	PermissionFlagsBits,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	TextChannel,
} from 'discord.js';
import { guildModel } from '../models/guild';
import { ERRORS } from '../constants';

export const data = new SlashCommandBuilder()
	.setName('reviewbutton')
	.setDescription('Send a review button in the current channel')
	.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
	const currentGuild = interaction.guild;
	if (!currentGuild) {
		return interaction.reply({ content: ERRORS.GUILD_ONLY, ephemeral: true });
	}

	const guild = await guildModel.findOne({ guildId: currentGuild.id });
	if (!guild) {
		return interaction.reply({ content: ERRORS.NEEDS_SETUP, ephemeral: true });
	}

	const member = await currentGuild.members.fetch(interaction.user.id);
	const hasPermission =
		member.permissions.has(PermissionFlagsBits.Administrator) ||
		guild.adminRoles.some((roleId) => member.roles.cache.has(roleId));

	if (!hasPermission) {
		return interaction.reply({
			content: 'You do not have permission to use this command.',
			ephemeral: true,
		});
	}

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId('submit_review').setLabel('Submit Review').setStyle(ButtonStyle.Primary)
	);

	if (!interaction.channel?.isTextBased()) {
		return interaction.reply({
			content: 'This command can only be used in text channels.',
			ephemeral: true,
		});
	}

	await (interaction.channel as TextChannel).send({
		components: [row],
	});

	return interaction.reply({
		content: 'Review button has been added!',
		ephemeral: true,
	});
}
