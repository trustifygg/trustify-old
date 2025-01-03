import { authenticate } from "../middlewares/authMiddlewares";
import { Hono } from "hono";

import type { Variables } from "../..";

const premiumRoute = new Hono<{ Variables: Variables }>();

premiumRoute.get("/", authenticate, async (c) => {});

export default premiumRoute;
