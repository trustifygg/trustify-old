import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Events,
	type Interaction,
} from 'discord.js';
import { createReviewModal, handleUsefulButton } from '../components/reviewButtons';
import { requireSetup } from '../lib/utils/checkSetup';
import type { ExtendedClient } from '../main';
import { Logger } from '../lib/utils/logger';
import { sendWebhookLog } from '../lib/utils/webhook';
import { guildModel, type IGuild } from '../models/guild';

export const event = {
	name: Events.InteractionCreate,
	once: false,
	async execute(interaction: Interaction, client: ExtendedClient) {
		const guildData = (await guildModel.findOne({
			guildId: interaction.guildId,
		})) as IGuild;

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel('Support Server')
				.setEmoji('🏠')
				.setURL('https://discord.gg/APa6ur9yqj')
		);

		if (interaction.isChatInputCommand()) {
			await sendWebhookLog(interaction, 'command');

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
						components: row.components.length ? [row] : undefined,
						flags: ['Ephemeral'],
					});
				}
			}
		}

		// Handle button clicks
		else if (interaction.isButton()) {
			await sendWebhookLog(interaction, 'button');

			if (interaction.customId !== 'submit_review' && !(await requireSetup(interaction as any))) return;

			if (interaction.customId === 'submit_review' || interaction.customId === 'writeReview') {
				const modal = createReviewModal();
				await interaction.showModal(modal);
			} else if (interaction.customId.startsWith('useful_')) {
				await handleUsefulButton(interaction, guildData);
			}
		}

		// Handle modal submissions
		else if (interaction.isModalSubmit() && interaction.customId === 'review_modal') {
			await interaction.deferReply({ flags: ['Ephemeral'] });
			await sendWebhookLog(interaction, 'modal');

			// Add permission check for review channel
			const guild = await guildModel.findOne({ guildId: interaction.guildId });
			if (guild?.channel) {
				const channel = await interaction.guild?.channels.fetch(guild.channel);
				if (channel?.isTextBased()) {
					const botUser = interaction.guild!.members.me!;
					const botPermissions = channel.permissionsFor(botUser);
					if (!botPermissions?.has(['SendMessages', 'ViewChannel', 'EmbedLinks'])) {
						return interaction.editReply({
							content:
								"I don't have the required permissions in the review channel. I need: `Send Messages`, `View Channel`, and `Embed Links` permissions.",
							components: [row],
						});
					}

					if (guild.createThreads && !botPermissions.has('CreatePublicThreads')) {
						return interaction.editReply({
							content:
								"Thread creation is enabled but I don't have the `Create Public Threads` permission in the review channel.",
							components: row.components.length ? [row] : undefined,
						});
					}
				}
			}

			const reviewContent = interaction.fields.getTextInputValue('review_content');
			const rating = parseInt(interaction.fields.getTextInputValue('review_rating'));

			if (isNaN(rating) || rating < 1 || rating > 5) {
				return interaction.editReply({
					content: 'Please provide a valid rating between 1 and 5.',
					components: row.components.length ? [row] : undefined,
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
				deferred: true,
				replied: false,
				reply: interaction.editReply.bind(interaction),
				deferReply: () => Promise.resolve(),
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
						await interaction.editReply({
							content: 'There was an error processing your review!',
							components: row.components.length ? [row] : undefined,
						});
					}
				}
			}
		}
	},
};
