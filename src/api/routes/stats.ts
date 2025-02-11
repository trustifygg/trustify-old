import { Hono } from "hono";
import { reviewModel } from "../../models/review";
import DiscordClient from "../../lib/utils/client";
import { Logger } from "../../lib/utils/logger";
import { manager } from "../..";

const statsRoute = new Hono();

statsRoute.get("/", async (c) => {
	try {
		const reviewStats = await reviewModel.aggregate([
			{
				$group: {
					_id: null,
					totalReviews: { $sum: 1 },
					averageRating: { $avg: "$rating" },
					totalUsefulVotes: { $sum: "$useful.count" },
					anonymousReviews: {
						$sum: { $cond: ["$anonymousReview", 1, 0] },
					},
				},
			},
		]);

		const shardStats = await manager.broadcastEval(async (client) => {
			return {
				guildCount: client.guilds.cache.size,
				memberCount: client.guilds.cache.reduce(
					(acc, guild) => acc + guild.memberCount,
					0
				),
			};
		});

		const totalGuilds = shardStats.reduce(
			(acc, curr) => acc + curr.guildCount,
			0
		);
		const totalMembers = shardStats.reduce(
			(acc, curr) => acc + curr.memberCount,
			0
		);

		const stats = {
			totalReviews: reviewStats[0]?.totalReviews || 0,
			averageRating: Number(reviewStats[0]?.averageRating?.toFixed(2)) || 0,
			totalGuilds,
			totalMembers,
			totalUsefulVotes: reviewStats[0]?.totalUsefulVotes || 0,
			anonymousReviews: reviewStats[0]?.anonymousReviews || 0,
		};

		c.header("Cache-Control", "public, max-age=60");
		return c.json(stats, 200);
	} catch (error) {
		Logger.error("Error fetching stats:" + error);
		return c.json(
			{
				message: "Internal server error",
			},
			500
		);
	}
});

statsRoute.get("/top", async (c) => {
	try {
		const res = await manager.broadcastEval(async (client) => {
			const topGuilds = client.guilds.cache
				.sort((a, b) => b.memberCount - a.memberCount)
				.first(20);

			return topGuilds.map((guild) => ({
				id: guild.id,
				name: guild.name,
				avatar: guild.iconURL({ size: 1024 }),
				memberCount: guild.memberCount,
			}));
		});

		const topGuilds = res.flat();

		const overallTopGuilds = topGuilds
			.sort((a, b) => b.memberCount - a.memberCount)
			.slice(0, 20);

		return c.json(overallTopGuilds, 200);
	} catch (err) {
		Logger.error("Error fetching top reviews:" + err);
		return c.json({ message: "Internal server error" }, 500);
	}
});

export default statsRoute;
