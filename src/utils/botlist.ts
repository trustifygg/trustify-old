import { setInterval } from 'node:timers';
import { Time } from '@imranbarbhuiya/duration';
import { request } from 'undici';
import { Logger } from './logger';
import {type  ClusterManager } from 'discord-hybrid-sharding';

export const postToTopGG = async (body: { server_count: number; shard_count?: number; shard_id?: number }) => {
	const url = 'https://top.gg/api/bots/stats';

	Logger.debug(`Posting to Top.gg...`, body);

	const res = await request(url, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: {
			authorization: `${Bun.env.TOPGG_TOKEN!}`,
			'content-type': 'application/json',
		},
	});

	if (res.statusCode !== 200) {
		Logger.error(`Failed to post to top.gg: ${res.statusCode}`);
		return;
	}

	await res.body.json();

	Logger.info('Posted to top.gg');
};

export const postData = (manager: ClusterManager) => {
	setInterval(async () => {
		const server_count = (await manager.broadcastEval((client) => client.guilds.cache.size)).reduce((prev, curr) => {
			prev += curr;
			return prev;
		}, 0);

		await postToTopGG({
			server_count,
			shard_count: manager.totalShards,
		});
	}, Time.Hour);
};