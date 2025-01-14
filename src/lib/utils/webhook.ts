import {
	WebhookClient,
	EmbedBuilder,
	type CommandInteractionOption,
	type Interaction,
	ChatInputCommandInteraction,
} from 'discord.js';
import { Logger } from './logger';
import { DEFAULT_EMBED_COLOR } from '../../constants';

const webhookClient = new WebhookClient({
	url: Bun.env.COMMANDS_WEBHOOK_URL!,
});

export const sendWebhookLog = async (interaction: Interaction, type: 'command' | 'modal' | 'button') => {
	if (!webhookClient) return;

	try {
		const guild = interaction.guild;
		const user = interaction.user;

		const embed = new EmbedBuilder()
			.setColor(DEFAULT_EMBED_COLOR)
			.setTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} Interaction Used`)
			.setTimestamp()
			.addFields(
				{ name: 'User', value: `${user.username} (${user.id})`, inline: true },
				{ name: 'Server', value: guild ? `${guild.name} (${guild.id})` : 'DM', inline: true }
			)
			.setThumbnail(guild?.iconURL() || null);

		if (interaction.isChatInputCommand()) {
			const options = getCommandOptions(interaction);
			embed.addFields(
				{ name: 'Command', value: `/${interaction.commandName}`, inline: false },
				{ name: 'Options', value: options || 'No options', inline: true }
			);
		} else if (interaction.isButton()) {
			embed.addFields({ name: 'Button ID', value: interaction.customId, inline: false });
		} else if (interaction.isModalSubmit()) {
			embed.addFields(
				{ name: 'Modal ID', value: interaction.customId, inline: false },
				{
					name: 'Fields',
					value: interaction.fields.fields.map((f) => f.customId).join(', ') || 'No fields',
					inline: true,
				}
			);
		}

		await webhookClient.send({ embeds: [embed] });
	} catch (error) {
		Logger.error('Failed to send webhook log:' + error);
	}
};

function getCommandOptions(interaction: ChatInputCommandInteraction): string {
	const options: string[] = [];

	for (const option of interaction.options.data) {
		const value = formatOptionValue(option);
		options.push(`${option.name}: ${value}`);
	}

	return options.length ? options.join('\n') : 'No options';
}

function formatOptionValue(option: CommandInteractionOption): string {
	if (option.value === undefined) return 'undefined';
	if (option.value === null) return 'null';

	return String(option.value);
}
