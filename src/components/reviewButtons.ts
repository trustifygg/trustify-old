import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ButtonInteraction,
} from "discord.js";
import { reviewModel } from "../models/review";
import type { GuildData } from "../types";
import { convertButtonStyle } from "../lib/utils/covertButtonStyle";

export function createReviewModal() {
	const modal = new ModalBuilder()
		.setCustomId("review_modal")
		.setTitle("Submit a Review");

	const ratingInput = new TextInputBuilder()
		.setCustomId("review_rating")
		.setLabel("Rating (1-5)")
		.setStyle(TextInputStyle.Short)
		.setMinLength(1)
		.setMaxLength(1)
		.setPlaceholder("Enter a number between 1 and 5")
		.setRequired(true);

	const reviewInput = new TextInputBuilder()
		.setCustomId("review_content")
		.setLabel("Your Review")
		.setStyle(TextInputStyle.Paragraph)
		.setMinLength(10)
		.setMaxLength(1000)
		.setPlaceholder("Share your experience...")
		.setRequired(true);

	const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
		ratingInput
	);
	const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
		reviewInput
	);

	modal.addComponents(firstRow, secondRow);
	return modal;
}

export async function handleUsefulButton(
	interaction: ButtonInteraction,
	guild: GuildData
) {
	const reviewId = interaction.customId.split("_")[1];
	const review = await reviewModel.findOne({ reviewId });

	if (!review) {
		return interaction.reply({
			content: "Review not found.",
			flags: ["Ephemeral"],
		});
	}

	const userId = interaction.user.id;
	const hasVoted = review.useful!.users.includes(userId);

	if (hasVoted) {
		review.useful!.users = review.useful!.users.filter((id) => id !== userId);
		review.useful!.count--;
	} else {
		review.useful!.users.push(userId);
		review.useful!.count++;
	}

	await review.save();

	const row = new ActionRowBuilder<ButtonBuilder>();

	if (guild.reviewButton) {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId("submit_review")
				.setLabel(guild.customReviewButton.label)
				.setStyle(convertButtonStyle(guild.customReviewButton.color))
		);
	}

	if (guild.usefulButton) {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(`useful_${reviewId}`)
				.setLabel(`Useful (${review.useful!.count})`)
				.setEmoji("👍")
				.setStyle(ButtonStyle.Secondary)
		);
	}

	await interaction.update({ components: [row] });
}
