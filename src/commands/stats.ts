import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, type ColorResolvable } from 'discord.js';
import { reviewModel } from '../models/review';
import { guildModel } from '../models/guild';
import { 
  DEFAULT_EMBED_COLOR, 
  STAR_GREEN, 
  STAR_YELLOW, 
  STAR_RED,
  STAR_EMPTY,
  ERRORS,
  DEFAULT_FOOTER
} from '../constants';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('View server review statistics');

function getStarsDisplay(count: number): string {
  const starEmoji = count >= 4 ? STAR_GREEN : count === 3 ? STAR_YELLOW : STAR_RED;
  return starEmoji.repeat(count) + STAR_EMPTY.repeat(5 - count);
}

function getProgressBar(percentage: number): string {
  const barWidth = 10; // Fixed width
  const filled = Math.round(percentage * barWidth / 100);
  const empty = barWidth - filled;
  return `\`${'█'.repeat(filled)}${'░'.repeat(empty)}\``; // Wrap in backticks for monospace
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const currentGuild = interaction.guild;
  if (!currentGuild) {
    return interaction.reply({ content: ERRORS.GUILD_ONLY, ephemeral: true });
  }

  const guild = await guildModel.findOne({ guildId: currentGuild.id });
  if (!guild) {
    return interaction.reply({ content: ERRORS.NEEDS_SETUP, ephemeral: true });
  }

  // Get all reviews
  const reviews = await reviewModel.find({ guildId: currentGuild.id }).sort({ createdAt: -1 });
  if (!reviews.length) {
    return interaction.reply({ content: 'No reviews found for this server.', ephemeral: true });
  }

  // Calculate statistics
  const totalReviews = reviews.length;
  const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / totalReviews;
  
  // Calculate rating distribution (reverse order: 5 to 1 stars)
  const distribution = Array(5).fill(0);
  reviews.forEach(review => distribution[5 - review.rating]++);
  const percentages = distribution.map(count => (count / totalReviews) * 100);

  // Get latest review
  const latestReview = reviews[0];
  const reviewer = await interaction.client.users.fetch(latestReview.authorId);

  const embed = new EmbedBuilder()
    .setColor((guild.customEmbed?.color || DEFAULT_EMBED_COLOR) as ColorResolvable)
    .setAuthor({
      name: `${currentGuild.name}'s Review Statistics`,
      iconURL: currentGuild.iconURL() ?? undefined
    })
    .setDescription(`Total Reviews: ${totalReviews} • Average Rating: ${averageRating.toFixed(1)} ${getStarsDisplay(Math.round(averageRating))}`)
    .addFields(
      {
        name: '📊 Rating Distribution',
        value: distribution.map((count, index) => {
          const percentage = (count / totalReviews) * 100;
          return `${getStarsDisplay(5 - index)} ${getProgressBar(percentage)} ${percentage.toFixed(1).padStart(5)}% (${count.toString().padStart(2)})`;
        }).join('\n'),
        inline: false
      },
      {
        name: '📝 Latest Review',
        value: [
          `From: ${guild.forceAnonymousReviews ? 'Anonymous' : reviewer.tag}`,
          `Rating: ${getStarsDisplay(latestReview.rating)}`,
          `Message: ${latestReview.review}`
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({ 
      text: guild.customEmbed?.footer?.text || DEFAULT_FOOTER,
      iconURL: interaction.client.user?.displayAvatarURL() ?? undefined
    });

  return interaction.reply({ embeds: [embed] });
} 