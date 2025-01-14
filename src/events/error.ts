import { Events } from 'discord.js';
import { Logger } from '../lib/utils/logger';
import { sendError } from '../lib/utils/sendError';
import type { ExtendedClient } from '../main';

export const event = {
	name: Events.Error,
	execute: (error: Error, client: ExtendedClient) => {
		sendError(client, error, 'Error');
		Logger.error(error);
	},
};
