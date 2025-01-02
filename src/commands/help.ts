import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ColorResolvable, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { 
  DEFAULT_EMBED_COLOR, 
  DEFAULT_FOOTER, 
  ERRORS,
  BOT_NAME 
} from '../constants';
import fs from 'fs';
import path from 'path';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('View all available commands');

export async function execute(interaction: ChatInputCommandInteraction) {
  const currentGuild = interaction.guild;
  if (!currentGuild) {
    return interaction.reply({ content: ERRORS.GUILD_ONLY, ephemeral: true });
  }
  
  // Load all commands
  const commandsPath = path.join(__dirname);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

  const adminCommands: string[] = [];
  const userCommands: string[] = [];

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command) {
      const permissions = command.data.default_member_permissions;
      const isAdminCommand = permissions === PermissionFlagsBits.Administrator.toString() || 
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
    .setAuthor({
      name: `${BOT_NAME}'s Help Menu`,
      iconURL: interaction.client?.user?.displayAvatarURL() ?? undefined
    })
    .setDescription(`Here's a list of ${BOT_NAME}' commands:`)
    .setThumbnail(interaction.client?.user?.displayAvatarURL() ?? undefined)
    .addFields(
      {
        name: '👤 User Commands',
        value: userCommands.join('\n') || 'No commands available',
        inline: false
      },
      {
        name: '⚡ Admin Commands',
        value: adminCommands.join('\n') || 'No commands available',
        inline: false
      }
    )
    .setFooter({ 
      text: `${DEFAULT_FOOTER} • Need help? Join our support server!`,
      iconURL: interaction.client?.user?.displayAvatarURL() ?? undefined
    });

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Invite Me')
        .setURL('https://google.com')
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('Support Server')
        .setURL('https://google.com')
        .setStyle(ButtonStyle.Link)
    );

  return interaction.reply({ 
    embeds: [embed], 
    components: [row],
    ephemeral: false 
  });
} 