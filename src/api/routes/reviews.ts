import { Hono } from "hono";
import { authenticate } from "../middlewares/authMiddlewares";
import DiscordClient from "../../utils/client";
import { reviewModel } from "../../models/review";

import type { Variables } from "../..";

const reviewsRoute = new Hono<{ Variables: Variables }>();

const client = DiscordClient.getInstance();

reviewsRoute.get("/:guildId", authenticate, async (c) => {
	const guildId = c.req.param("guildId");
	const user = c.get("user");

	if (!client.checkUserInGuild(guildId, user!.userId)) {
		return c.json({ message: "You don't have access to this guild" }, 403);
	}

	const reviews = await reviewModel.find({ guildId }).sort({ createdAt: -1 });

	const reviewsRes = reviews.map((review) => ({
		id: review.reviewId,
		review: review.review,
		rating: review.rating,
		anonymous: review.anonymousReview,
		useful: review.useful?.count,
		authorId: review.authorId,
		guildId: review.guildId,
		messageId: review.messageId,
		createdAt: review.createdAt,
	}));

	return c.json(reviewsRes, 200);
});

export default reviewsRoute;
