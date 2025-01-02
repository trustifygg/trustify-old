import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ColorResolvable } from 'discord.js';
import { guildModel } from '../models/guild';
import { DEFAULT_EMBED_COLOR, DEFAULT_FOOTER, ERRORS } from '../constants';
import { logReview } from '../events/reviewLog';

export const data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configure server review settings')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(option =>
    option.setName('review_channel')
      .setDescription('Channel for reviews'))
  .addChannelOption(option =>
    option.setName('logs_channel')
      .setDescription('Channel for review logs'))
  .addBooleanOption(option =>
    option.setName('review_button')
      .setDescription('Show review button'))
  .addBooleanOption(option =>
    option.setName('useful_button')
      .setDescription('Show useful button on reviews'))
  .addRoleOption(option =>
    option.setName('admin_role')
      .setDescription('Role that can manage reviews'))
  .addStringOption(option =>
    option.setName('review_title')
      .setDescription('Custom title for reviews (e.g., "New Review", "Feedback")'))
  .addBooleanOption(option =>
    option.setName('force_anonymous')
      .setDescription('Force all reviews to be anonymous'))
  .addBooleanOption(option =>
    option.setName('create_threads')
      .setDescription('Create discussion threads for reviews'))
  .addStringOption(option =>
    option.setName('embed_color')
      .setDescription('Custom color for embeds (hex code)'))
  .addStringOption(option =>
    option.setName('footer_text')
      .setDescription('Custom footer text for embeds'));

export async function execute(interaction: ChatInputCommandInteraction) {
  const currentGuild = interaction.guild;
  if (!currentGuild) {
    return interaction.reply({ content: ERRORS.GUILD_ONLY, ephemeral: true });
  }

  // Check if guild exists in database
  const existingGuild = await guildModel.findOne({ guildId: currentGuild.id });
  if (!existingGuild) {
    return interaction.reply({ content: ERRORS.NEEDS_SETUP, ephemeral: true });
  }

  const updateData: any = {};

  // Only update fields that were provided
  const reviewChannel = interaction.options.getChannel('review_channel');
  if (reviewChannel && 'isTextBased' in reviewChannel && reviewChannel.isTextBased()) {
    updateData.channel = reviewChannel.id;
  }

  const logsChannel = interaction.options.getChannel('logs_channel');
  if (logsChannel && 'isTextBased' in logsChannel && logsChannel.isTextBased()) {
    updateData.logsChannel = logsChannel.id;
  }

  const reviewButton = interaction.options.getBoolean('review_button');
  if (reviewButton !== null) updateData.reviewButton = reviewButton;

  const usefulButton = interaction.options.getBoolean('useful_button');
  if (usefulButton !== null) updateData.usefulButton = usefulButton;

  const adminRole = interaction.options.getRole('admin_role');
  if (adminRole) {
    const currentAdminRoles = existingGuild.adminRoles || [];
    if (!currentAdminRoles.includes(adminRole.id)) {
      updateData.adminRoles = [...currentAdminRoles, adminRole.id];
    }
  }

  const reviewTitle = interaction.options.getString('review_title');
  if (reviewTitle) updateData.reviewTitle = reviewTitle;

  const forceAnonymous = interaction.options.getBoolean('force_anonymous');
  if (forceAnonymous !== null) updateData.forceAnonymousReviews = forceAnonymous;

  const createThreads = interaction.options.getBoolean('create_threads');
  if (createThreads !== null) updateData.createThreads = createThreads;

  const embedColor = interaction.options.getString('embed_color');
  if (embedColor) updateData['customEmbed.color'] = embedColor;

  const footerText = interaction.options.getString('footer_text');
  if (footerText) updateData['customEmbed.footer.text'] = footerText;

  // Update guild settings
  const guild = await guildModel.findOneAndUpdate(
    { guildId: currentGuild.id },
    updateData,
    { new: true }
  );

  if (!guild) {
    return interaction.reply({ 
      content: ERRORS.SETUP_FAILED, 
      ephemeral: true 
    });
  }

  // Create response embed
  const embed = new EmbedBuilder()
    .setColor((guild.customEmbed?.color || DEFAULT_EMBED_COLOR) as ColorResolvable)
    .setTitle('Server Review Settings Updated')
    .addFields(
      {
        name: 'General Settings',
        value: [
          `Review Title: ${guild.reviewTitle}`,
          `Review Channel: ${guild.channel ? `<#${guild.channel}>` : 'Not set'}`,
          `Logs Channel: ${guild.logsChannel ? `<#${guild.logsChannel}>` : 'Not set'}`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Features',
        value: [
          `Force Anonymous: ${guild.forceAnonymousReviews ? '✅' : '❌'}`,
          `Create Threads: ${guild.createThreads ? '✅' : '❌'}`,
          `Review Button: ${guild.reviewButton ? '✅' : '❌'}`,
          `Useful Button: ${guild.usefulButton ? '✅' : '❌'}`
        ].join('\n'),
        inline: true
      },
      {
        name: 'Roles',
        value: [
          `Admin Roles: ${guild.adminRoles.length ? guild.adminRoles.map(id => `<@&${id}>`).join(', ') : 'None'}`,
          `Review Roles: ${guild.reviewRoles.length ? guild.reviewRoles.map(id => `<@&${id}>`).join(', ') : 'None'}`,
          `Blacklisted Roles: ${guild.blacklistedRoles.length ? guild.blacklistedRoles.map(id => `<@&${id}>`).join(', ') : 'None'}`
        ].join('\n'),
        inline: true
      }
    )
    .setFooter({ 
      text: guild.customEmbed?.footer?.text || DEFAULT_FOOTER,
      iconURL: interaction.client?.user?.displayAvatarURL() ?? undefined
    });

  // Log changes
  if (guild.logsChannel) {
    await logReview(
      currentGuild.id,
      `⚙️ **Server Settings Updated**
      Updated by: ${interaction.user.tag} (${interaction.user.id})
      Changes:
      ${Object.keys(updateData)
        .map(key => `- ${key}: ${updateData[key]}`)
        .join('\n')}`
    );
  }

  return interaction.reply({ embeds: [embed], ephemeral: true });
} 