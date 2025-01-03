import { config } from 'dotenv';
import { Client, GatewayIntentBits, Collection, ChatInputCommandInteraction } from 'discord.js';
import { connectToDatabase } from './config/mongodb';
import fs from 'fs';
import path from 'path';
import { setClient } from './events/reviewLog';
import { createReviewModal, handleUsefulButton } from './components/reviewButtons';
import { requireSetup } from './utils/checkSetup';
import { Logger } from './utils/logger';

config();
connectToDatabase();

export interface ExtendedClient extends Client {
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
}) as ExtendedClient;
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.ts'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
		Logger.info(`Loaded command: ${command.data.name}`);
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

setClient(client);
client.login(process.env.DISCORD_TOKEN);
