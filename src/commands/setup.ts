import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ColorResolvable, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { guildModel } from '../models/guild';
import { DEFAULT_EMBED_COLOR, DEFAULT_FOOTER, ERRORS, BOT_NAME } from '../constants';
import { logReview } from '../events/reviewLog';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Setup server review settings')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(option =>
    option.setName('review_channel')
      .setDescription('Channel for reviews')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('logs_channel')
      .setDescription('Channel for review logs')
      .setRequired(true))
  .addBooleanOption(option =>
    option.setName('review_button')
      .setDescription('Show review button')
      .setRequired(true))
  .addBooleanOption(option =>
    option.setName('useful_button')
      .setDescription('Show useful button on reviews')
      .setRequired(true))
  .addRoleOption(option =>
    option.setName('admin_role')
      .setDescription('Role that can manage reviews')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('review_title')
      .setDescription('Custom title for reviews (e.g., "New Review", "Feedback")')
      .setRequired(false))
  .addBooleanOption(option =>
    option.setName('force_anonymous')
      .setDescription('Force all reviews to be anonymous')
      .setRequired(false))
  .addBooleanOption(option =>
    option.setName('create_threads')
      .setDescription('Create discussion threads for reviews')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('embed_color')
      .setDescription('Custom color for embeds (hex code)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('footer_text')
      .setDescription('Custom footer text for embeds')
      .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  const currentGuild = interaction.guild;
  if (!currentGuild) {
    return interaction.reply({ content: ERRORS.GUILD_ONLY, ephemeral: true });
  }

  let guild = await guildModel.findOne({ guildId: currentGuild.id });
  
  // Get all options
  const reviewTitle = interaction.options.getString('review_title');
  const reviewChannel = interaction.options.getChannel('review_channel', true);
  const logsChannel = interaction.options.getChannel('logs_channel', true);
  const forceAnonymous = interaction.options.getBoolean('force_anonymous');
  const createThreads = interaction.options.getBoolean('create_threads');
  const reviewButton = interaction.options.getBoolean('review_button', true);
  const usefulButton = interaction.options.getBoolean('useful_button', true);
  const embedColor = interaction.options.getString('embed_color');
  const footerText = interaction.options.getString('footer_text');
  const blacklistRole = interaction.options.getRole('blacklist_role');

  const updateData: any = {
    guildId: currentGuild.id,
    name: currentGuild.name,
    iconURL: currentGuild.iconURL(),
    channel: reviewChannel.id,
    logsChannel: logsChannel.id,
    reviewButton: reviewButton,
    usefulButton: usefulButton
  };

  // Update data if options are provided
  if (reviewTitle) updateData.reviewTitle = reviewTitle;
  if (forceAnonymous !== null) updateData.forceAnonymousReviews = forceAnonymous;
  if (createThreads !== null) updateData.createThreads = createThreads;
  if (embedColor) updateData['customEmbed.color'] = embedColor;
  if (footerText) updateData['customEmbed.footer.text'] = footerText;
  if (blacklistRole) {
    const currentBlacklist = guild?.blacklistedRoles || [];
    if (!currentBlacklist.includes(blacklistRole.id)) {
      updateData.blacklistedRoles = [...currentBlacklist, blacklistRole.id];
    }
  }

  guild = await guildModel.findOneAndUpdate(
    { guildId: currentGuild.id },
    updateData,
    { upsert: true, new: true }
  );

  // Verify log channel is text based
  if (!('isTextBased' in logsChannel) || !logsChannel.isTextBased()) {
    return interaction.reply({
      content: ERRORS.LOGS_TEXT_ONLY,
      ephemeral: true
    });
  }

  if (!guild) {
    return interaction.reply({ 
      content: ERRORS.SETUP_FAILED, 
      ephemeral: true 
    });
  }

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
          `Review Roles: ${guild.reviewRoles.length ? guild.reviewRoles.map(id => `<@&${id}>`).join(', ') : 'None'}`,
          `Blacklisted Roles: ${guild.blacklistedRoles.length ? guild.blacklistedRoles.map(id => `<@&${id}>`).join(', ') : 'None'}`
        ].join('\n'),
        inline: true
      }
    )
    .setFooter({ 
      text: guild.customEmbed?.footer?.text || DEFAULT_FOOTER,
      iconURL: currentGuild.iconURL() ?? undefined
    });

  // Log setup changes
  if (guild.logsChannel) {
    await logReview(
      currentGuild.id,
      `⚙️ **Server Settings Updated**
      Updated by: ${interaction.user.tag} (${interaction.user.id})
      Changes:
      ${Object.keys(updateData)
        .filter(key => key !== 'guildId' && key !== 'name' && key !== 'iconURL')
        .map(key => `- ${key}: ${updateData[key]}`)
        .join('\n')}`
    );
  }

  if (guild.channel) {
    const channel = await currentGuild.channels.fetch(guild.channel);
    if (channel?.isTextBased()) {
      const welcomeEmbed = new EmbedBuilder()
        .setColor((guild.customEmbed?.color || DEFAULT_EMBED_COLOR) as ColorResolvable)
        .setDescription('To submit a Review, click the \'Submit Review\' button below.\n\nProvide a rating (1-5) and share your experience with the server.')
        .setAuthor({
          name: BOT_NAME,
          iconURL: interaction.client.user?.displayAvatarURL() ?? undefined
        })
        .setThumbnail(interaction.client.user?.displayAvatarURL() ?? undefined)

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('submit_review')
            .setLabel('Submit Review')
            .setStyle(ButtonStyle.Success)
        );

      await channel.send({
        embeds: [welcomeEmbed],
        components: [row]
      });
    }
  }

  return interaction.reply({ embeds: [embed], ephemeral: true });
} 