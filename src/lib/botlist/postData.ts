import { Time } from "@imranbarbhuiya/duration";
import type { ClusterManager } from "discord-hybrid-sharding";
import { postToTopGG } from "./topgg/postToTopGG";

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
