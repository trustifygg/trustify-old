import { config } from "dotenv";
import {
	Client,
	GatewayIntentBits,
	Collection,
	ChatInputCommandInteraction,
} from "discord.js";
import { connectToDatabase } from "./lib/config/mongodb";
import fs from "fs";
import path from "path";
import { setClient } from "./events/reviewLog";
import { Logger } from "./lib/utils/logger";
import { sendError } from "./lib/utils/sendError";
import { Agent } from "undici";

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

const agent = new Agent({
	connect: {
		timeout: 10_000,
	},
	
});

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
	rest: {
		retries: 3,
		timeout: 30_000,
	},
}) as ExtendedClient;

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
	.readdirSync(commandsPath)
	.filter((file) => file.endsWith(".ts"));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ("data" in command && "execute" in command) {
		client.commands.set(command.data.name, command);
	}
}

// Load events
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
	.readdirSync(eventsPath)
	.filter((file) => file.endsWith(".ts"));

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

client.on("error", (error) => {
	sendError(error, "error");
});

client.rest.on("rateLimited", (data) => {
	Logger.debug(data);
});

const verifyAndSend = (error: Error, name: string) => {
	sendError(error, name);
};

process.on("unhandledRejection", (error: Error) => {
	verifyAndSend(error, "Unhandled Promise Rejection");
});
process.on("uncaughtException", (error) => {
	verifyAndSend(error, "Uncaught Exception");
});

process.on("uncaughtExceptionMonitor", (error) => {
	verifyAndSend(error, "Uncaught Exception Monitor");
});

setClient(client);

void client.login(Bun.env.DISCORD_TOKEN);
