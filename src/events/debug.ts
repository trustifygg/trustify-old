import { Events } from 'discord.js';
import { execute } from '../commands/botinfo';
import { Logger } from '../utils/logger';

export const event = {
	name: Events.Debug,
	async execute(message: any) {
		Logger.djsDebug(message);
	},
};
