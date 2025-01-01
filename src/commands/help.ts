import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ColorResolvable } from 'discord.js';
import { guildModel } from '../models/guild';
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

  const guild = await guildModel.findOne({ guildId: currentGuild.id });
  
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
                            command.data.name === 'deletereview';
      
      const commandInfo = `\`/${command.data.name}\` - ${command.data.description}`;
      
      if (isAdminCommand) {
        adminCommands.push(commandInfo);
      } else {
        userCommands.push(commandInfo);
      }
    }
  }

  const embed = new EmbedBuilder()
    .setColor((guild?.customEmbed?.color || DEFAULT_EMBED_COLOR) as ColorResolvable)
    .setAuthor({
      name: `${BOT_NAME} Commands`,
      iconURL: interaction.client.user?.displayAvatarURL() ?? undefined
    })
    .setDescription('Here are all available commands:')
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
      text: DEFAULT_FOOTER,
      iconURL: interaction.client.user?.displayAvatarURL() ?? undefined
    });

  return interaction.reply({ embeds: [embed], ephemeral: true });
} 