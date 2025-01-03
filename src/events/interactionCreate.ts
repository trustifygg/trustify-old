import { ChatInputCommandInteraction, Events, type Interaction } from 'discord.js';
import { createReviewModal, handleUsefulButton } from '../components/reviewButtons';
import { requireSetup } from '../utils/checkSetup';
import type { ExtendedClient } from '../main';
import { Logger } from '../utils/logger';

export const event = {
	name: Events.InteractionCreate,
	once: false,
	async execute(interaction: Interaction, client: ExtendedClient) {
		if (interaction.isChatInputCommand()) {
			const command = client.commands.get(interaction.commandName);
			if (!command) return;

			try {
				// Check setup before executing any command
				if (!(await requireSetup(interaction))) return;

				await command.execute(interaction);
			} catch (error) {
				Logger.error(String(error));
				if (!interaction.replied && !interaction.deferred) {
					await interaction.reply({
						content: 'There was an error executing this command!',
						flags: ['Ephemeral'],
					});
				}
			}
		}

		// Handle button clicks
		else if (interaction.isButton()) {
			if (interaction.customId !== 'submit_review' && !(await requireSetup(interaction as any))) return;

			if (interaction.customId === 'submit_review') {
				const modal = createReviewModal();
				await interaction.showModal(modal);
			} else if (interaction.customId.startsWith('useful_')) {
				await handleUsefulButton(interaction);
			}
		}

		// Handle modal submissions
		else if (interaction.isModalSubmit() && interaction.customId === 'review_modal') {
			const reviewContent = interaction.fields.getTextInputValue('review_content');
			const rating = parseInt(interaction.fields.getTextInputValue('review_rating'));

			if (isNaN(rating) || rating < 1 || rating > 5) {
				return interaction.reply({
					content: 'Please provide a valid rating between 1 and 5.',
					flags: ['Ephemeral'],
				});
			}

			const modifiedInteraction = {
				...interaction,
				commandName: 'review',
				options: {
					getInteger: (name: string, required?: boolean) => (name === 'stars' ? rating : null),
					getString: (name: string, required?: boolean) => (name === 'message' ? reviewContent : null),
					get: () => null,
					getFocused: () => null,
					getMentionable: () => null,
					getAttachment: () => null,
					getBoolean: () => null,
					getChannel: () => null,
					getNumber: () => null,
					getRole: () => null,
					getSubcommand: () => null,
					getSubcommandGroup: () => null,
					getUser: () => null,
				},
				guild: interaction.guild,
				user: interaction.user,
				reply: interaction.reply.bind(interaction),
				deferReply: interaction.deferReply.bind(interaction),
				editReply: interaction.editReply.bind(interaction),
				deleteReply: interaction.deleteReply.bind(interaction),
				followUp: interaction.followUp.bind(interaction),
				isChatInputCommand: () => true,
			} as ChatInputCommandInteraction;

			const command = client.commands.get('review');
			if (command) {
				try {
					await command.execute(modifiedInteraction);
				} catch (error) {
					Logger.error(String(error));
					if (!interaction.replied && !interaction.deferred) {
						await interaction.reply({
							content: 'There was an error processing your review!',
							flags: ['Ephemeral'],
						});
					}
				}
			}
		}
	},
};
