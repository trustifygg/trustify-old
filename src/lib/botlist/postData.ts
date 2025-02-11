import { Time } from '@imranbarbhuiya/duration';
import { postToTopGG } from './topgg/postToTopGG';
import type { ShardingManager } from 'discord.js';

export const postData = (manager: ShardingManager) => {
	setInterval(async () => {
		const server_count = (await manager.broadcastEval((client) => client.guilds.cache.size)).reduce((prev, curr) => {
			prev += curr;
			return prev;
		}, 0);

		await postToTopGG({
			server_count,
			shard_count: 1,
		});
	}, Time.Hour);
};
