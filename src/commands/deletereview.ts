import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { reviewModel } from '../models/review';
import { guildModel } from '../models/guild';
import { ERRORS } from '../constants';

export const data = new SlashCommandBuilder()
	.setName('deletereview')
	.setDescription('Delete a review by ID')
	.addStringOption((option) =>
		option.setName('review_id').setDescription('The ID of the review to delete').setRequired(true)
	);

export async function execute(interaction: ChatInputCommandInteraction) {
	const currentGuild = interaction.guild;
	if (!currentGuild) {
		return interaction.reply({ content: ERRORS.GUILD_ONLY, ephemeral: true });
	}

	const guild = await guildModel.findOne({ guildId: currentGuild.id });
	if (!guild) {
		return interaction.reply({ content: ERRORS.NEEDS_SETUP, ephemeral: true });
	}

	// Check if user has permission (admin or has admin role)
	const member = await currentGuild.members.fetch(interaction.user.id);
	const hasPermission =
		member.permissions.has(PermissionFlagsBits.Administrator) ||
		guild.adminRoles.some((roleId) => member.roles.cache.has(roleId));

	if (!hasPermission) {
		return interaction.reply({
			content: 'You do not have permission to delete reviews.',
			ephemeral: true,
		});
	}

	const reviewId = interaction.options.getString('review_id', true);
	const review = await reviewModel.findOne({ reviewId, guildId: currentGuild.id });

	if (!review) {
		return interaction.reply({
			content: 'Review not found.',
			ephemeral: true,
		});
	}

	if (review.messageId && guild.channel) {
		try {
			const channel = await currentGuild.channels.fetch(guild.channel);
			if (channel?.isTextBased()) {
				const message = await channel.messages.fetch(review.messageId);
				await message.delete();
			}
		} catch (error) {
			console.error('Failed to delete review message:', error);
		}
	}

	if (review.threadId) {
		try {
			const thread = await currentGuild.channels.fetch(review.threadId);
			if (thread?.isThread()) {
				await thread.delete();
			}
		} catch (error) {
			console.error('Failed to delete review thread:', error);
		}
	}

	// Delete the review from database
	await reviewModel.deleteOne({ reviewId, guildId: currentGuild.id });

	return interaction.reply({
		content: `Review ${reviewId} has been deleted.`,
		ephemeral: true,
	});
}
