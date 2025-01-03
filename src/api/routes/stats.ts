import { Hono } from "hono";
import { reviewModel } from "../../models/review";
import DiscordClient from "../../utils/client";

const statsRoute = new Hono();

const client = DiscordClient.getInstance();

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

		const discordClient = await client.getClient();

		const guildCount = discordClient.guilds.cache.size;
		const totalMembers = discordClient.guilds.cache.size;

		const ratingsDistribution = await reviewModel.aggregate([
			{
				$group: {
					_id: "$rating",
					count: { $sum: 1 },
				},
			},
			{ $sort: { _id: 1 } },
		]);

		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

		const reviewsOverTime = await reviewModel.aggregate([
			{
				$match: {
					createdAt: { $gte: sixMonthsAgo },
				},
			},
			{
				$group: {
					_id: {
						year: { $year: "$createdAt" },
						month: { $month: "$createdAt" },
					},
					count: { $sum: 1 },
				},
			},
			{ $sort: { "_id.year": 1, "_id.month": 1 } },
		]);

		const stats = {
			overview: {
				totalReviews: reviewStats[0]?.totalReviews || 0,
				averageRating: Number(reviewStats[0]?.averageRating?.toFixed(2)) || 0,
				totalGuilds: guildCount,
				totalMembers,
				totalUsefulVotes: reviewStats[0]?.totalUsefulVotes || 0,
				anonymousReviews: reviewStats[0]?.anonymousReviews || 0,
			},
			ratingsDistribution: ratingsDistribution.reduce((acc, curr) => {
				acc[curr._id] = curr.count;
				return acc;
			}, {} as Record<number, number>),
			reviewsOverTime: reviewsOverTime.map((item) => ({
				date: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
				count: item.count,
			})),
		};

		return c.json(stats, 200);
	} catch (error) {
		console.error("Error fetching stats:", error);
		c.json(
			{
				message: "Internal server error",
			},
			500
		);
	}
});

export default statsRoute;
