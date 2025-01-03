import { Client, Events, REST, Routes, ActivityType } from 'discord.js';
import { Logger } from '../utils/logger';
import { reviewModel } from '../models/review';
import fs from 'fs';
import path from 'path';

export const event = {
	name: Events.ClientReady,
	once: true,
	async execute(client: Client) {
		if (!client.user || !client.application) {
			return;
		}

		let currentStatus = 0;
		const totalReviews = await reviewModel.countDocuments();

		const statuses = [
			{
				type: ActivityType.Custom,
				name: 'Simplifying reviews',
				state: 'Simplifying reviews',
			},
			{
				type: ActivityType.Watching,
				name: `${totalReviews.toLocaleString()} reviews`,
			},
			{
				type: ActivityType.Custom,
				name: `${client.guilds.cache.size.toLocaleString()} servers`,
			},
		];

		client.user.setActivity(statuses[0].name, {
			type: statuses[0].type,
			state: statuses[0].state,
		});

		setInterval(async () => {
			currentStatus = (currentStatus + 1) % statuses.length;
			const status = statuses[currentStatus];

			if (currentStatus === 1) {
				const updatedReviews = await reviewModel.countDocuments();
				status.name = `${updatedReviews.toLocaleString()} reviews`;
			}

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
