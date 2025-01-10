import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	time,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ColorResolvable,
} from "discord.js";
import { guildModel } from "../models/guild";
import { reviewModel, type IReview } from "../models/review";
import {
	STAR_EMOJI,
	MAX_STARS,
	DEFAULT_EMBED_COLOR,
	DEFAULT_REVIEW_TITLE,
	DEFAULT_FOOTER,
	ERRORS,
} from "../constants";
import { logReview } from "../events/reviewLog";
import { Logger } from "../utils/logger";
import { generateReviewId, getStarsDisplay } from "../utils/utils";

export const data = new SlashCommandBuilder()
	.setName("review")
	.setDescription("Review this server")
	.addIntegerOption((option) =>
		option
			.setName("stars")
			.setDescription("Rating for the server")
			.setRequired(true)
			.addChoices(
				{ name: `${STAR_EMOJI} One Star`, value: 1 },
				{ name: `${STAR_EMOJI.repeat(2)} Two Stars`, value: 2 },
				{ name: `${STAR_EMOJI.repeat(3)} Three Stars`, value: 3 },
				{ name: `${STAR_EMOJI.repeat(4)} Four Stars`, value: 4 },
				{ name: `${STAR_EMOJI.repeat(5)} Five Stars`, value: 5 }
			)
	)
	.addStringOption((option) =>
		option
			.setName("message")
			.setDescription("Your review message")
			.setRequired(true)
			.setMinLength(10)
			.setMaxLength(1000)
	);

// Command execution
export async function execute(interaction: ChatInputCommandInteraction) {
	const stars = interaction.options.getInteger("stars", true);
	const reviewContent = interaction.options.getString("message", true);

	const currentGuild = interaction.guild;
	if (!currentGuild) {
		return interaction.reply({
			content: ERRORS.GUILD_ONLY,
			flags: ["Ephemeral"],
		});
	}

	const guild = await guildModel.findOne({ guildId: currentGuild.id });
	if (!guild) {
		return interaction.reply({
			content: ERRORS.NEEDS_SETUP,
			flags: ["Ephemeral"],
		});
	}

	if (!guild.channel) {
		return interaction.reply({
			content: ERRORS.NO_REVIEW_CHANNEL,
			flags: ["Ephemeral"],
		});
	}

	const member = await currentGuild.members.fetch(interaction.user.id);

	if (guild.blacklistedRoles.some((roleId) => member.roles.cache.has(roleId))) {
		return interaction.reply({
			content: "You are not allowed to submit reviews.",
			flags: ["Ephemeral"],
		});
	}

	if (
		guild.reviewRoles.length > 0 &&
		!guild.reviewRoles.some((roleId) => member.roles.cache.has(roleId))
	) {
		return interaction.reply({
			content: "You need one of the required roles to submit reviews.",
			flags: ["Ephemeral"],
		});
	}

	try {
		const reviewId = generateReviewId();
		const currentDate = new Date();
		const totalReviews = await reviewModel.countDocuments({
			guildId: currentGuild.id,
		});
		const reviewNumber = totalReviews + 1;

		const embed = new EmbedBuilder()
			.setColor(
				(guild.customEmbed?.color || DEFAULT_EMBED_COLOR) as ColorResolvable
			)
			.setAuthor({
				name: `Review from ${
					guild.forceAnonymousReviews ? "Anonymous" : interaction.user.username
				}`,
				iconURL: guild.forceAnonymousReviews
					? currentGuild.iconURL() ?? undefined
					: interaction.user.displayAvatarURL({
							size: 128,
							forceStatic: false,
					  }),
			})
			.setTitle(guild.reviewTitle || DEFAULT_REVIEW_TITLE)
			.setDescription(`> ${reviewContent}`)
			.addFields(
				{
					name: "Rating",
					value: `${getStarsDisplay(stars)} (${stars}/${MAX_STARS})`,
					inline: true,
				},
				{
					name: "Reviewed",
					value: `${time(currentDate, "R")}`,
					inline: true,
				}
			)
			.setFooter({
				text: `${DEFAULT_FOOTER} • Review ID: ${reviewId}`,
				iconURL: interaction.client?.user?.displayAvatarURL() ?? undefined,
			});

		if (currentGuild.iconURL()) {
			embed.setThumbnail(currentGuild.iconURL() ?? null);
		}

		const channel = await currentGuild.channels.fetch(guild.channel);
		if (!channel?.isTextBased()) {
			return interaction.reply({
				content: ERRORS.INVALID_CHANNEL,
				flags: ["Ephemeral"],
			});
		}

		const components = [];
		const row = new ActionRowBuilder<ButtonBuilder>();

		if (guild.reviewButton) {
			row.addComponents(
				new ButtonBuilder()
					.setCustomId("submit_review")
					.setLabel("Submit Review")
					.setStyle(ButtonStyle.Primary)
			);
		}

		if (guild.usefulButton) {
			row.addComponents(
				new ButtonBuilder()
					.setCustomId(`useful_${reviewId}`)
					.setLabel("Useful (0)")
					.setEmoji("👍")
					.setStyle(ButtonStyle.Secondary)
			);
		}

		components.push(row);

		const reviewMessage = await channel.send({
			embeds: [embed],
			components: components.length > 0 ? components : undefined,
		});

		const reviewData: Partial<IReview> = {
			guildId: currentGuild.id,
			reviewId,
			authorId: interaction.user.id,
			review: reviewContent,
			rating: stars,
			anonymousReview: guild.forceAnonymousReviews,
			createdAt: currentDate,
			messageId: reviewMessage.id,
			useful: {
				count: 0,
				users: [],
			},
			threadId: undefined,
		};

		if (guild.createThreads && reviewMessage.id) {
			const createdThread = await reviewMessage.startThread({
				name: `Review Discussion #${reviewNumber}`,
				autoArchiveDuration: 1440,
			});
			reviewData.threadId = createdThread.id;
		}

		const review = new reviewModel(reviewData);
		await review.save();

		await logReview(
			currentGuild.id,
			`📝 **New Review**
		Author: ${guild.forceAnonymousReviews ? "Anonymous • " : ""}${
				interaction.user.tag
			} (${interaction.user.id})
		Rating: ${stars}/5
		Review ID: ${reviewId}
		Posted in: <#${guild.channel}>
		${reviewData.threadId ? `Thread: <#${reviewData.threadId}>` : ""}
		
		${reviewContent}`
		);

		try {
			if (guild.dmOptIn) {
				const dmEmbed = new EmbedBuilder()
					.setColor(
						(guild.customEmbed?.color || DEFAULT_EMBED_COLOR) as ColorResolvable
					)
					.setTitle("Thank you for your review!")
					.setDescription(
						"Thank you for your review! We really appreciate your feedback."
					)
					.setTimestamp()
					.setFooter({
						text: currentGuild.name,
						iconURL: currentGuild.iconURL() ?? undefined,
					});

				const serverInfoButton =
					new ActionRowBuilder<ButtonBuilder>().setComponents(
						new ButtonBuilder()
							.setCustomId(`server_info`)
							.setLabel(`Sent from: ${currentGuild.name}`)
							.setEmoji("📝")
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(true)
					);

				await interaction.user.send({
					embeds: [dmEmbed],
					components: [serverInfoButton],
				});
			}
		} catch (error) {
			Logger.error("Failed to send DM:" + error);
		}

		return interaction.reply({
			content: `Your review has been posted in ${channel}!`,
			flags: ["Ephemeral"],
		});
	} catch (error) {
		Logger.error(error);
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel("Support Server")
				.setEmoji("🏠")
				.setURL("https://discord.gg/APa6ur9yqj")
		);
		return interaction.reply({
			content: "An error occurred while processing your review.",
			components: [row],
			flags: ["Ephemeral"],
		});
	}
}
