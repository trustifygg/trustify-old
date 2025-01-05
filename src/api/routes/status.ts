import { Hono } from 'hono';
import { manager } from '../..';

const statusRoute = new Hono();

let resultCache: { time: null | number; result: null | object } = {
	time: null,
	result: null,
};

statusRoute.get('/', async (c) => {
	if (resultCache.time && Date.now() - resultCache.time < 5000) {
		return c.json(resultCache.result, 200);
	}

	resultCache.time = Date.now();
	const results = await manager.broadcastEval(async (client) => {
		return {
			shardId: client.shard?.ids[0] ?? 0,
			guildCount: client.guilds.cache.size,
			memberCount: client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0),
			uptime: client.uptime,
			status: client.ws.status === 0 ? 'operational' : client.ws.status === 1 ? 'partial' : 'offline',
		};
	});

	const data = [];
	const totalShards = manager.totalShards;

	// Process results for each shard
	for (let i = 0; i < totalShards; i++) {
		const shardData = results.find((result) => result.shardId === i);
		if (shardData) {
			data.push(shardData);
		} else {
			data.push({
				shardId: i,
				guildCount: 0,
				memberCount: 0,
				uptime: 0,
				status: 'offline',
			});
		}
	}

	const totalMembers = data.reduce((acc, shard) => acc + shard.memberCount, 0);
	const totalGuilds = data.reduce((acc, shard) => acc + shard.guildCount, 0);

	// Calculate average uptime only from operational shards
	const operationalShards = data.filter((shard) => shard.status === 'operational');
	const averageUptime =
		operationalShards.length > 0
			? operationalShards.reduce((acc, shard) => acc + (shard.uptime || 0), 0) / operationalShards.length
			: 0;

	resultCache.result = {
		shards: data.sort((a, b) => a.shardId - b.shardId),
		totalMembers,
		totalGuilds,
		averageUptime,
	};

	// Set CORS and cache headers
	c.header('Access-Control-Allow-Origin', '*');
	c.header('Cache-Control', 'public, max-age=5'); // Cache for 5 seconds
	return c.json(resultCache.result, 200);
});

export default statusRoute;
