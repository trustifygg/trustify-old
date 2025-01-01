import mongoose from 'mongoose';
export interface IGuild extends mongoose.Document {
	guildId: string;
	name: string;
	iconURL?: string;
	channel?: string;
	logsChannel?: string;
	reviewRoles: string[];
	anonymousReviews: boolean;
	forceAnonymousReviews: boolean;
	createThreads: boolean;
	reviewButton: boolean;
	ratingEmoji: string;
	reviewTitle: string;
	usefulButton: boolean;
	customReviewButton: {
		label: string;
		color: string;
	};
	customEmbed: {
		color: string;
		footer: { text: string };
	};
	blacklistedRoles: string[];
	adminRoles: string[];
}

const guildSchema = new mongoose.Schema({
	guildId: { type: String, required: true, unique: true },
	name: { type: String, required: true },
	iconURL: String,
	channel: { type: String, default: '' },
	logsChannel: { type: String, default: '' },
	reviewRoles: {
		type: [String],
		default: [],
		validate: [
			{
				validator: (array: string[]) => array.length <= 5,
				message: 'Cannot have more than 5 review roles',
			},
		],
	},
	anonymousReviews: { type: Boolean, default: false },
	forceAnonymousReviews: { type: Boolean, default: false },
	createThreads: { type: Boolean, default: true },
	reviewButton: { type: Boolean, default: true },
	usefulButton: { type: Boolean, default: true },
	ratingEmoji: { type: String, default: '⭐' },
	reviewTitle: { type: String, default: 'New Review Submitted!' },
	customReviewButton: {
		label: { type: String, default: 'Submit Review' },
		color: {
			type: String,
			default: 'blurple',
			enum: ['blurple', 'red', 'green', 'grey'],
		},
	},
	customEmbed: {
		color: { type: String, default: '#058c42' },
		footer: {
			text: { type: String, default: 'Trustify - Simplifying reviews' },
		},
	},
	blacklistedRoles: {
		type: [String],
		default: [],
	},
	adminRoles: {
		type: [String],
		default: [],
	},
});

export const guildModel = mongoose.model<IGuild>('GuildDB', guildSchema, 'Guilds');
