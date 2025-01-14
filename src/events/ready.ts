import { Client, Events, REST, Routes, ActivityType } from 'discord.js';
import { Logger } from '../lib/utils/logger';
import { reviewModel } from '../models/review';
import fs from 'fs';
import path from 'path';
import { BOT_TAGLINE } from '../constants';

export const event = {
	name: Events.ClientReady,
	once: true,
	async execute(client: Client) {
		if (!client.user || !client.application) {
			return;
		}

		let currentStatus = 0;
		const totalReviews = await reviewModel.countDocuments();
		const guilds = client.guilds.cache.size.toLocaleString();

		const statuses = [
			{
				type: ActivityType.Custom,
				name: `💙 ${BOT_TAGLINE}`,
				state: `💙 ${BOT_TAGLINE}`,
			},
			{
				type: ActivityType.Watching,
				name: `${totalReviews.toLocaleString()} reviews`,
			},
			{
				type: ActivityType.Custom,
				name: `🚀 ${guilds} servers`,
				state: `🚀 ${guilds} servers`,
			},
		];

		client.user.setActivity(statuses[0].name, {
			type: statuses[0].type,
			state: statuses[0].state,
		});

		setInterval(async () => {
			currentStatus = (currentStatus + 1) % statuses.length;
			const status = statuses[currentStatus];

			const updatedReviews = await reviewModel.countDocuments();
			const updatedGuilds = client.guilds.cache.size.toLocaleString();

			statuses[1].name = `${updatedReviews.toLocaleString()} reviews`;
			statuses[2].name = `🚀 ${updatedGuilds} servers`;
			statuses[2].state = `🚀 ${updatedGuilds} servers`;

			client.user?.setActivity(status.name, {
				type: status.type,
				state: status.state,
			});
		}, 30000);

		const commands = [];
		const commandsPath = path.join(__dirname, '..', 'commands');
		const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.ts'));

		for (const file of commandFiles) {
			const command = require(path.join(commandsPath, file));
			if ('data' in command) {
				commands.push(command.data.toJSON());
			}
		}

		try {
			Logger.info(`Started refreshing ${commands.length} application (/) commands.`);

			const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
			await rest.put(Routes.applicationCommands(client.application.id), {
				body: commands,
			});

			Logger.info(`Successfully reloaded ${commands.length} application (/) commands.`);
		} catch (error) {
			Logger.error(`Error refreshing commands: ${error}`);
		}

		Logger.info(`Ready! Logged in as ${client.user.tag}`);
	},
};

export default event;
