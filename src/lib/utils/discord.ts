import type { DiscordGuild, DiscordTokens, DiscordUser } from '../../types/discord';
import { Logger } from './logger';

const DISCORD_API_URL = 'https://discord.com/api';

export const exchangeCode = async (code: string): Promise<DiscordTokens> => {
	try {
		const params = new URLSearchParams({
			client_id: Bun.env.DISCORD_CLIENT_ID!,
			client_secret: Bun.env.DISCORD_CLIENT_SECRET!,
			grant_type: 'authorization_code',
			code,
			redirect_uri: Bun.env.DISCORD_REDIRECT_URI!,
		});

		const response = await fetch(`${DISCORD_API_URL}/oauth2/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: params,
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to exchange code: ${error}`);
		}

		return response.json() as Promise<DiscordTokens>;
	} catch (err) {
		throw new Error(`Failed to exchange code: ${err}`);
	}
};

export const getUserData = async (accessToken: string): Promise<DiscordUser> => {
	const response = await fetch(`${DISCORD_API_URL}/users/@me`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		throw new Error('Failed to fetch user data');
	}

	return response.json() as Promise<DiscordUser>;
};

export async function getUserGuilds(accessToken: string) {
	const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	return await response.json();
}

export const getBotGuilds = async (botToken: string): Promise<DiscordGuild[]> => {
	const response = await fetch(`${DISCORD_API_URL}/users/@me/guilds`, {
		headers: {
			Authorization: `Bot ${botToken}`,
		},
	});

	if (!response.ok) {
		throw new Error('Failed to fetch bot guilds');
	}

	return response.json() as Promise<DiscordGuild[]>;
};

export const refreshToken = async (refresh_token: string): Promise<DiscordTokens> => {
	const params = new URLSearchParams({
		client_id: Bun.env.DISCORD_CLIENT_ID!,
		client_secret: Bun.env.DISCORD_CLIENT_SECRET!,
		grant_type: 'refresh_token',
		refresh_token,
	});

	const response = await fetch(`${DISCORD_API_URL}/oauth2/token`, {
		method: 'POST',

		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},

		body: params,
	});

	if (!response.ok) {
		const error = await response.text();

		throw new Error(`Failed to refresh token: ${error}`);
	}

	return response.json() as Promise<DiscordTokens>;
};
