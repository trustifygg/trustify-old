import { Client, Events, GatewayIntentBits, PermissionFlagsBits } from 'discord.js';
import { Logger } from './logger';

export default class DiscordClient {
	private static instance: DiscordClient;

	private client: Client | null = null;

	public static getInstance(): DiscordClient {
		if (!DiscordClient.instance) {
			DiscordClient.instance = new DiscordClient();
		}
		return DiscordClient.instance;
	}

	public async getClient(): Promise<Client> {
		if (!this.client) {
			Logger.debug('Creating new client');
			this.client = new Client({
				intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
			});
			this.client.once(Events.ClientReady, (c) => {
				Logger.info(`Ready! Logged in as ${c.user.tag}`);
			});
			if (process.env.NODE_ENV === 'development') {
				this.client.on('debug', Logger.debug);
			}
			this.client.on('warn', Logger.warn);
			this.client.on('error', Logger.error);
			await this.client.login(process.env.DISCORD_BOT_TOKEN);
		}
		return this.client;
	}

	public async logout() {
		this.client?.destroy();
	}

	public async getUser(userId: string) {
		try {
			const client = await this.getClient();
			return await client.users.fetch(userId);
		} catch (_err) {
			return null;
		}
	}

	public async getUserAvatar(userId: string, avatarHash: string) {
		if (avatarHash === null) {
			const index = (BigInt(userId) >> 22n) % 6n;
			return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
		}
		return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`;
	}

	public async getGuild(guildId: string) {
		try {
			const client = await this.getClient();
			return await client.guilds.fetch(guildId);
		} catch (_err) {
			return null;
		}
	}

	public async getRole(guildId: string, roleId: string) {
		try {
			const guild = await this.getGuild(guildId);
			if (guild === null) {
				return null;
			}
			return await guild.roles.fetch(roleId);
		} catch (_err) {
			return null;
		}
	}

	public async getChannel(channelId: string) {
		try {
			const client = await this.getClient();
			return await client.channels.fetch(channelId);
		} catch (_err) {
			return null;
		}
	}

	public async getGuildMember(guildId: string, userId: string) {
		try {
			const guild = await this.getGuild(guildId);
			if (guild === null) {
				return null;
			}
			return await guild.members.fetch(userId);
		} catch (_err) {
			return null;
		}
	}

	public async checkUserInGuild(guildId: string, userId: string) {
		return (await this.getGuildMember(guildId, userId)) !== null;
	}

	public async checkUserPermissions(guildId: string, userId: string) {
		const guild = await this.getGuild(guildId);

		if (guild === null) {
			return false;
		}

		const member = await this.getGuildMember(guildId, userId);

		if (member === null) {
			return false;
		}

		return member.permissions.has(PermissionFlagsBits.ManageGuild);
	}
}
