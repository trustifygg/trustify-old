export type TopGGWebhook = {
	bot: string;
	user: string;
	type: 'upvote' | 'test';
	isWeekend: boolean;
	query?: string;
};
