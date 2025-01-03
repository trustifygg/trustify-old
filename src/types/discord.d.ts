export interface DiscordTokens {
	access_token: string;
	refresh_token: string;
	token_type: string;
	expires_in: number;
	scope: string;
}

export interface DiscordUser {
	id: string;
	username: string;
	email: string;
	avatar: string | null;
}

export interface DiscordGuild {
	id: string;
	name: string;
	icon: string | null;
	permissions: string;
	botPresent?: boolean;
}
