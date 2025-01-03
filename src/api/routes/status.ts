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
		const guildData = await Promise.all(
			client.guilds.cache.map((guild) => {
				return {
					shardId: guild.shardId,
					memberCount: guild.memberCount,
					uptime: client.uptime,
					status: client.ws.status === 0 ? 'operational' : client.ws.status === 1 ? 'partial' : 'offline',
				};
			})
		);
		return guildData;
	});

	const flattenedResults = results.flat();
	const shardCounters = new Map<number, number>();

	const data = flattenedResults.reduce((acc: any[], current: any) => {
		if (!shardCounters.has(current.shardId)) {
			shardCounters.set(current.shardId, 0);
		}

		const counter = shardCounters.get(current.shardId)!;
		shardCounters.set(current.shardId, counter + 1);
		const existing = acc.find((item: any) => item.shardId === current.shardId);

		if (existing) {
			existing.memberCount += current.memberCount;
			existing.uptime = Math.max(existing.uptime, current.uptime);
			existing.guildCount += 1;
			existing.status =
				current.status === 'offline' || existing.status === 'offline'
					? 'offline'
					: current.status === 'partial' || existing.status === 'partial'
						? 'partial'
						: 'operational';
		} else {
			acc.push({
				shardId: current.shardId,
				guildCount: 1,
				memberCount: current.memberCount,
				uptime: current.uptime,
				status: current.status,
			});
		}
		return acc;
	}, []);

	const totalShards = manager.totalShards;

	for (let i = 0; i < totalShards; i++) {
		if (!data.find((shard) => shard.shardId === i)) {
			data.push({
				shardId: i,
				guildCount: 0,
				memberCount: 0,
				uptime: 0,
				status: 'offline',
			});
		}
	}

	const totalMembers = data.reduce((acc, result) => acc + result.memberCount, 0);
	const totalGuilds = data.reduce((acc, result) => acc + result.guildCount, 0);
	const averageUptime = data.reduce((acc, result) => acc + (result.uptime ?? 0), 0) / results.length;

	resultCache.result = {
		shards: data.sort((a, b) => a.shardId - b.shardId),
		totalMembers,
		totalGuilds,
		averageUptime,
	};

	return c.json(resultCache.result, 200);
});

export default statusRoute;
