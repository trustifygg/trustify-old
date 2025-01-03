import { ChatInputCommandInteraction } from 'discord.js';
import { guildModel } from '../models/guild';

export async function requireSetup(interaction: ChatInputCommandInteraction): Promise<boolean> {
	const allowedCommands = ['setup', 'help', 'botinfo'];
	if (allowedCommands.includes(interaction.commandName)) return true;

	const guild = await guildModel.findOne({ guildId: interaction.guildId });

	if (!guild) {
		await interaction.reply({
			content: 'This server needs to be set up first! Please ask an admin to use the `/setup` command.',
			ephemeral: true,
		});
		return false;
	}

	return true;
}
