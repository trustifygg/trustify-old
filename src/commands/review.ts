import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  time, 
  Message, 
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ColorResolvable 
} from 'discord.js';
import { guildModel } from '../models/guild';
import { reviewModel } from '../models/review';
import { 
  STAR_EMOJI, 
  MAX_STARS, 
  STAR_GREEN, 
  STAR_YELLOW, 
  STAR_RED, 
  STAR_EMPTY, 
  DEFAULT_EMBED_COLOR,
  DEFAULT_REVIEW_TITLE,
  DEFAULT_FOOTER,
  ERRORS 
} from '../constants';
import { logReview } from '../events/reviewLog';

// Utility functions
function generateReviewId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getStarsDisplay(count: number): string {
  let starEmoji;
  if (count >= 4) {
    starEmoji = STAR_GREEN;  // 4-5 stars = green
  } else if (count === 3) {
    starEmoji = STAR_YELLOW; // 3 stars = yellow
  } else {
    starEmoji = STAR_RED;    // 1-2 stars = red
  }
  return starEmoji.repeat(count) + STAR_EMPTY.repeat(MAX_STARS - count);
}

export const data = new SlashCommandBuilder()
  .setName('review')
  .setDescription('Review this server')
  .addIntegerOption(option =>
    option.setName('stars')
      .setDescription('Rating for the server')
      .setRequired(true)
      .addChoices(
        { name: `${STAR_EMOJI} One Star`, value: 1 },
        { name: `${STAR_EMOJI.repeat(2)} Two Stars`, value: 2 },
        { name: `${STAR_EMOJI.repeat(3)} Three Stars`, value: 3 },
        { name: `${STAR_EMOJI.repeat(4)} Four Stars`, value: 4 },
        { name: `${STAR_EMOJI.repeat(5)} Five Stars`, value: 5 },
      ))
  .addStringOption(option =>
    option.setName('message')
      .setDescription('Your review message')
      .setRequired(true)
      .setMinLength(10)
      .setMaxLength(1000));

// Command execution
export async function execute(interaction: ChatInputCommandInteraction) {
  const stars = interaction.options.getInteger('stars', true);
  const reviewContent = interaction.options.getString('message', true);
  
  const currentGuild = interaction.guild;
  if (!currentGuild) {
    return interaction.reply({ 
      content: ERRORS.GUILD_ONLY, 
      ephemeral: true 
    });
  }

  const guild = await guildModel.findOne({ guildId: currentGuild.id });
  if (!guild) {
    return interaction.reply({ 
      content: ERRORS.NEEDS_SETUP, 
      ephemeral: true 
    });
  }

  if (!guild.channel) {
    return interaction.reply({ 
      content: ERRORS.NO_REVIEW_CHANNEL, 
      ephemeral: true 
    });
  }

  const member = await currentGuild.members.fetch(interaction.user.id);
  
  if (guild.blacklistedRoles.some(roleId => member.roles.cache.has(roleId))) {
    return interaction.reply({
      content: 'You are not allowed to submit reviews.',
      ephemeral: true
    });
  }

  if (guild.reviewRoles.length > 0 && !guild.reviewRoles.some(roleId => member.roles.cache.has(roleId))) {
    return interaction.reply({
      content: 'You need one of the required roles to submit reviews.',
      ephemeral: true
    });
  }

  const reviewId = generateReviewId();
  const currentDate = new Date();
  const totalReviews = await reviewModel.countDocuments({ guildId: currentGuild.id });
  const reviewNumber = totalReviews + 1;

  const review = new reviewModel({
    guildId: currentGuild.id,
    reviewId,
    authorId: interaction.user.id,
    review: reviewContent,
    rating: stars,
    anonymousReview: guild.forceAnonymousReviews,
    createdAt: currentDate,
    useful: {
      count: 0,
      users: []
    }
  });

  await review.save();

  const embed = new EmbedBuilder()
    .setColor((guild.customEmbed?.color || DEFAULT_EMBED_COLOR) as ColorResolvable)
    .setAuthor({
      name: `Review from ${guild.forceAnonymousReviews ? 'Anonymous' : interaction.user.username}`,
      iconURL: guild.forceAnonymousReviews ? currentGuild.iconURL() ?? undefined : interaction.user.displayAvatarURL({ size: 128, forceStatic: false })
    })
    .setTitle(guild.reviewTitle || DEFAULT_REVIEW_TITLE)
    .setDescription(`> ${reviewContent}`)
    .addFields(
      { 
        name: 'Rating', 
        value: `${getStarsDisplay(stars)} (${stars}/${MAX_STARS})`,
        inline: true 
      },
      { 
        name: 'Reviewed', 
        value: `${time(currentDate, 'R')}`,
        inline: true 
      }
    )
    .setFooter({ 
      text: `${guild.customEmbed?.footer?.text || DEFAULT_FOOTER} • Review ID: ${reviewId}`,
      iconURL: interaction.client?.user?.displayAvatarURL() ?? undefined
    });

  if (currentGuild.iconURL()) {
    embed.setThumbnail(currentGuild.iconURL() ?? null);
  }

  const channel = await currentGuild.channels.fetch(guild.channel);
  if (!channel?.isTextBased()) {
    return interaction.reply({ 
      content: 'The configured review channel is invalid. Ask an admin to fix this using /setup', 
      ephemeral: true 
    });
  }

  const components = [];
  if (guild.usefulButton || guild.reviewButton) {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (guild.reviewButton) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('submit_review')
          .setLabel('Submit Review')
          .setStyle(ButtonStyle.Success)
      );
    }

    if (guild.usefulButton) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`useful_${reviewId}`)
          .setLabel('Useful (0)')
          .setEmoji('👍')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    components.push(row);
  }

  const reviewMessage = await channel.send({ 
    embeds: [embed],
    components: components.length > 0 ? components : undefined
  });

  if (guild.createThreads && reviewMessage.id) {
    const createdThread = await reviewMessage.startThread({
      name: `Review Discussion #${reviewNumber}`,
      autoArchiveDuration: 1440
    });
    
    review.threadId = createdThread.id;
    review.messageId = reviewMessage.id;
    await review.save();

    await logReview(
      currentGuild.id,
      `📝 **New Review**
      Author: ${guild.forceAnonymousReviews ? 'Anonymous • ' : ''}${interaction.user.tag} (${interaction.user.id})
      Rating: ${stars}/5
      Review ID: ${reviewId}
      Posted in: <#${guild.channel}>
      Thread: <#${createdThread.id}>
      
      ${reviewContent}`
    );
  } else {
    await logReview(
      currentGuild.id,
      `📝 **New Review**
      Author: ${guild.forceAnonymousReviews ? 'Anonymous • ' : ''}${interaction.user.tag} (${interaction.user.id})
      Rating: ${stars}/5
      Review ID: ${reviewId}
      Posted in: <#${guild.channel}>
      
      ${reviewContent}`
    );
  }

  try {
    if (guild.dmOptIn) {
      const dmEmbed = new EmbedBuilder()
        .setColor((guild.customEmbed?.color || DEFAULT_EMBED_COLOR) as ColorResolvable)
        .setTitle('Thank you for your vouch!')
        .setDescription('Thank you for your vouch! We really appreciate your feedback.')
        .setTimestamp()
        .setFooter({
          text: currentGuild.name,
          iconURL: currentGuild.iconURL() ?? undefined
        });

      await interaction.user.send({ embeds: [dmEmbed] });
    }
  } catch (error) {
    console.error('Failed to send DM:', error);
  }

  return interaction.reply({ 
    content: `Review posted in ${channel}!`, 
    ephemeral: true 
  });
} 