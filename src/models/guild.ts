import mongoose from "mongoose";
import type { GuildData } from "../types";
import { DEFAULT_EMBED_COLOR, DEFAULT_FOOTER } from "../constants";

const guildSchema = new mongoose.Schema<GuildData>({
	guildId: { type: String, required: true, unique: true },
	name: { type: String, required: true },
	iconURL: String,
	channel: { type: String, default: "" },
	logsChannel: { type: String, default: "" },
	anonymousReviews: { type: Boolean, default: false },
	forceAnonymousReviews: { type: Boolean, default: false },
	createThreads: { type: Boolean, default: true },
	reviewButton: { type: Boolean, default: true },
	usefulButton: { type: Boolean, default: true },
	ratingEmoji: { type: String, default: "⭐" },
	reviewTitle: { type: String, default: "New Review Submitted!" },
	customReviewButton: {
		label: { type: String, default: "Submit Review" },
		color: {
			type: String,
			default: "blurple",
			enum: ["blurple", "red", "green", "grey"],
		},
	},
	customReviewEmbed: {
		color: { type: String, default: "#5865F2" },
		footer: { type: String, default: DEFAULT_FOOTER },
	},
	reviewRoles: {
		type: [String],
		default: [],
		validate: [
			{
				validator: (array: string[]) => array.length <= 5,
				message: "Cannot have more than 5 review roles",
			},
		],
	},
	blacklistedRoles: {
		type: [String],
		default: [],
	},
	adminRoles: {
		type: [String],
		default: [],
	},
	dmNotification: {
		enabled: { type: Boolean, default: true },
		color: { type: String, default: "#5865F2" },
		title: { type: String, default: "Thank you for your review!" },
		description: {
			type: String,
			default: "Thank you for your review! We really appreciate your feedback.",
		},
	},
	dmOptIn: {
		type: Boolean,
		default: true,
	},
});

export const guildModel = mongoose.model<GuildData>(
	"GuildDB",
	guildSchema,
	"Guilds"
);
