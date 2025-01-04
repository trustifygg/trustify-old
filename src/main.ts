import { config } from 'dotenv';
import { Client, GatewayIntentBits, Collection, ChatInputCommandInteraction, Guild, User } from 'discord.js';
import { connectToDatabase } from './config/mongodb';
import fs from 'fs';
import path from 'path';
import { setClient } from './events/reviewLog';
import { ClusterClient, getInfo } from 'discord-hybrid-sharding';
import DiscordClient from './utils/client';
import { Logger } from './utils/logger';
import { sendError } from './utils/sendError';

config();
connectToDatabase();

export interface ExtendedClient extends Client {
	cluster: ClusterClient;
	commands: Collection<
		string,
		{
			data: { name: string };
			execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
		}
	>;
}

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
	shards: getInfo().SHARD_LIST,
	shardCount: getInfo().TOTAL_SHARDS,
}) as ExtendedClient;

client.cluster = new ClusterClient(client);

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.ts'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	}
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.ts'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const { event } = require(filePath);

	if (!event) continue;

	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args, client));
	} else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}

client.on('error', (error) => {
	sendError(client, error, 'error');
});

client.rest.on('rateLimited', (data) => {
	Logger.debug(data);
});

const verifyAndSend = (error: Error, name: string) => {
	sendError(client, error, name);
};

process.on('unhandledRejection', (error: Error) => {
	verifyAndSend(error, 'Unhandled Promise Rejection');
});
process.on('uncaughtException', (error) => {
	verifyAndSend(error, 'Uncaught Exception');
});

process.on('uncaughtExceptionMonitor', (error) => {
	verifyAndSend(error, 'Uncaught Exception Monitor');
});

setClient(client)

void client.login(Bun.env.DISCORD_TOKEN);
