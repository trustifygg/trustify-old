import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
	type ColorResolvable,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from 'discord.js';
import { DEFAULT_EMBED_COLOR, DEFAULT_FOOTER, ERRORS, BOT_NAME } from '../constants';
import fs from 'fs';
import path from 'path';

export const data = new SlashCommandBuilder().setName('help').setDescription('View all available commands');

export async function execute(interaction: ChatInputCommandInteraction) {
	const currentGuild = interaction.guild;
	if (!currentGuild) {
		return interaction.reply({
			content: ERRORS.GUILD_ONLY,
			flags: ['Ephemeral'],
		});
	}

	// Load all commands
	const commandsPath = path.join(__dirname);
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.ts'));

	const adminCommands: string[] = [];
	const userCommands: string[] = [];

	for (const file of commandFiles) {
		const command = require(path.join(commandsPath, file));
		if ('data' in command) {
			const permissions = command.data.default_member_permissions;
			const isAdminCommand =
				permissions === PermissionFlagsBits.Administrator.toString() ||
				['deletereview', 'reviewbutton'].includes(command.data.name);

			const commandInfo = `\`/${command.data.name}\` - ${command.data.description}`;

			if (isAdminCommand) {
				adminCommands.push(commandInfo);
			} else {
				userCommands.push(commandInfo);
			}
		}
	}

	const embed = new EmbedBuilder()
		.setColor(DEFAULT_EMBED_COLOR)
		.setTitle('Help Menu')
		.setDescription(`Here's a list of ${BOT_NAME}'s commands:`)
		.setThumbnail(interaction.client?.user?.displayAvatarURL() ?? undefined)
		.addFields(
			{
				name: '👤 User Commands',
				value: userCommands.join('\n') || 'No commands available',
				inline: false,
			},
			{
				name: '⚡ Admin Commands',
				value: adminCommands.join('\n') || 'No commands available',
				inline: false,
			}
		)
		.setFooter({
			text: `${DEFAULT_FOOTER} • Need help? Join our support server!`,
			iconURL: interaction.client?.user?.displayAvatarURL() ?? undefined,
		});

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setLabel('Invite Me').setURL('https://www.trustify.gg/invite').setStyle(ButtonStyle.Link),
		new ButtonBuilder().setLabel('Support Server').setURL('https://www.trustify.gg/support').setStyle(ButtonStyle.Link),
		new ButtonBuilder().setLabel('Vote').setURL('https://www.trustify.gg/vote').setStyle(ButtonStyle.Link)
	);
	const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setLabel('Terms of Use').setURL('https://www.trustify.gg/terms').setStyle(ButtonStyle.Link),
		new ButtonBuilder().setLabel('Privacy Policy').setURL('https://www.trustify.gg/privacy').setStyle(ButtonStyle.Link)
	);

	return interaction.reply({
		embeds: [embed],
		components: [row, row2],
	});
}
