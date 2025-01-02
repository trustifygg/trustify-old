import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  ButtonInteraction,
} from 'discord.js';
import { reviewModel } from '../models/review';

export function createReviewModal() {
  const modal = new ModalBuilder()
    .setCustomId('review_modal')
    .setTitle('Submit a Review');

  const reviewInput = new TextInputBuilder()
    .setCustomId('review_content')
    .setLabel('Your Review')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(10)
    .setMaxLength(1000)
    .setPlaceholder('Share your experience...')
    .setRequired(true);

  const ratingInput = new TextInputBuilder()
    .setCustomId('review_rating')
    .setLabel('Rating (1-5)')
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(1)
    .setPlaceholder('Enter a number between 1 and 5')
    .setRequired(true);

  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reviewInput);
  const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(ratingInput);

  modal.addComponents(firstRow, secondRow);
  return modal;
}

export async function handleUsefulButton(interaction: ButtonInteraction) {
  const reviewId = interaction.customId.split('_')[1];
  const review = await reviewModel.findOne({ reviewId });
  
  if (!review) {
    return interaction.reply({ 
      content: 'Review not found.', 
      ephemeral: true 
    });
  }

  const userId = interaction.user.id;
  const hasVoted = review.useful!.users.includes(userId);

  if (hasVoted) {
    review.useful!.users = review.useful!.users.filter(id => id !== userId);
    review.useful!.count--;
  } else {
    review.useful!.users.push(userId);
    review.useful!.count++;
  }

  await review.save();

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('submit_review')
        .setLabel('Submit Review')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`useful_${reviewId}`)
        .setLabel(`Useful (${review.useful!.count})`)
        .setEmoji('👍')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.update({ components: [row] });
} 