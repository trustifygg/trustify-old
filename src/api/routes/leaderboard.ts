import { Hono } from 'hono';
import { reviewModel } from '../../models/review';
import { Logger } from '../../lib/utils/logger';
import { manager } from '../..';

const leaderboardRoute = new Hono();

leaderboardRoute.get('/', async (c) => {
	try {
		const topGuilds = await reviewModel.aggregate([
			{
				$group: {
					_id: '$guildId',
					totalReviews: { $sum: 1 },
					averageRating: { $avg: '$rating' },
				},
			},
			{
				$sort: { totalReviews: -1 },
			},
			{
				$limit: 10,
			},
		]);

		// Get guild details from Discord for the top guilds
		const guildIds = topGuilds.map((guild) => guild._id);

		// Fetch guild information across all shards
		const guildsInfo = (
			await manager.broadcastEval(
				async (client, { guildIds }) => {
					return guildIds
						.map((id) => {
							const guild = client.guilds.cache.get(id);
							if (!guild) return null;
							return {
								id: guild.id,
								name: guild.name,
								icon: guild.icon,
							};
						})
						.filter((g) => g !== null);
				},
				{ context: { guildIds } }
			)
		).flat();

		// Create a map for quick guild lookup
		const guildInfoMap = new Map(guildsInfo.map((guild) => [guild.id, guild]));

		// Combine review stats with guild details
		const leaderboard = topGuilds.map((guild) => {
			const guildInfo = guildInfoMap.get(guild._id);
			return {
				guildId: guild._id,
				name: guildInfo?.name || 'Unknown Server',
				icon: guildInfo?.icon || null,
				totalReviews: guild.totalReviews,
				averageRating: Number(guild.averageRating.toFixed(2)),
			};
		});

		// Cache headers for better performance
		c.header('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
		return c.json(leaderboard, 200);
	} catch (error) {
		Logger.error('Error fetching leaderboard:' + error);
		return c.json({ message: 'Internal server error' }, 500);
	}
});

export default leaderboardRoute;
