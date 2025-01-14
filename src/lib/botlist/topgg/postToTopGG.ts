import { request } from "undici";
import { Logger } from "../../utils/logger";

export const postToTopGG = async (body: {
	server_count: number;
	shard_count?: number;
	shard_id?: number;
}) => {
	const url = "https://top.gg/api/bots/stats";

	Logger.debug(`Posting to Top.gg...`, body);

	const res = await request(url, {
		method: "POST",
		body: JSON.stringify(body),
		headers: {
			authorization: `${Bun.env.TOPGG_TOKEN!}`,
			"content-type": "application/json",
		},
	});

	if (res.statusCode !== 200) {
		Logger.error(`Failed to post to top.gg: ${res.statusCode}`);
		return;
	}

	await res.body.json();

	Logger.info("Posted to top.gg");
};
