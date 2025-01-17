import { IGuild } from '../models/guild';

export interface GuildData {
	guildId: string;
	name: string;
	iconURL?: string | null;
	channel: string;
	logsChannel: string;
	anonymousReviews: boolean;
	forceAnonymousReviews: boolean;
	createThreads: boolean;
	reviewButton: boolean;
	usefulButton: boolean;
	ratingEmoji: string;
	reviewTitle: string;
	reviewRoles?: string[];
	blacklistedRoles?: string[];
	adminRoles?: string[];
	customReviewButton: {
		label: string;
		color: 'blurple' | 'red' | 'green' | 'grey';
	};
	customReviewEmbed: {
		color: string;
		footer: string;
	};
	adminRoles: {
		type: [String];
		default: [];
	};
	dmNotification: {
		enabled: boolean;
		color: string;
		title: string;
		description: string;
	};
}

export interface UserData {
	userId: string;
	username: string;
	avatar: string;
	email: string;
	votedAt: Date;
}

export type TopGGWebhook = {
	bot: string;
	user: string;
	type: 'upvote' | 'test';
	isWeekend: boolean;
	query?: string;
};
