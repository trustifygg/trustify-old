import type { Context, Next } from "hono";
import { userModel } from "../../models/users";
import { getCookie } from "hono/cookie";
import { decode, verify, sign } from "hono/jwt";
import { refreshToken } from "../../utils/discord";
import { setCookie } from "hono/cookie";
import { JWT_COOKIE_OPTIONS } from "../routes/auth";

export const authenticate = async (c: Context, next: Next) => {
	try {
		const session = c.get("session");

		if (session?.user?.userId) {
			const user = await userModel
				.findOne({ userId: session.user.userId })
				.select("+accessToken +refreshToken");

			if (user) {
				c.set("user", user);
				return next();
			}
		}

		const cookieToken = getCookie(c, "token");
		const authHeader = c.req.header("Authorization");
		const authHeaderToken = authHeader?.startsWith("Bearer ")
			? authHeader.substring(7)
			: null;
		const token = cookieToken || authHeaderToken;

		if (!token) {
			return c.json({ message: "Authentication required" }, 401);
		}

		try {
			const decoded = await verify(token, Bun.env.JWT_SECRET!);

			const user = await userModel
				.findOne({ userId: decoded.userId })
				.select("+accessToken +refreshToken");

			if (!user) {
				return c.json({ message: "User not found" }, 401);
			}

			c.set("user", user);

			if (session && !session.user) {
				session.user = {
					userId: user.userId,
					username: user.username,
					email: user.email,
					avatar: user.avatar || "",
					accessToken: user.accessToken,
					refreshToken: user.refreshToken,
				};
				c.set("session", session);
			}

			return next();
		} catch (err) {
			try {
				const decodedWithoutVerification = decode(token);
				const now = Math.floor(Date.now() / 1000);

				if (
					decodedWithoutVerification.payload.exp &&
					decodedWithoutVerification.payload.exp < now
				) {
					const user = await userModel
						.findOne({ userId: decodedWithoutVerification.payload.userId })
						.select("+accessToken +refreshToken");

					if (!user?.refreshToken) {
						return c.json({ message: "Token expired" }, 401);
					}

					try {
						const newTokens = await refreshToken(user.refreshToken);

						user.accessToken = newTokens.access_token;
						user.refreshToken = newTokens.refresh_token;
						await user.save();

						const newToken = await sign(
							{
								userId: user.userId,
								exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
							},
							Bun.env.JWT_SECRET!
						);

						setCookie(c, "token", newToken, JWT_COOKIE_OPTIONS);

						if (session) {
							session.user = {
								userId: user.userId,
								username: user.username,
								email: user.email,
								avatar: user.avatar || "",
								accessToken: newTokens.access_token,
								refreshToken: newTokens.refresh_token,
							};
							c.set("session", session);
						}

						c.set("user", user);
						return next();
					} catch (refreshError) {
						return c.json({ message: "Token refresh failed" }, 401);
					}
				}
			} catch (decodeErr) {
				return c.json({ message: "Invalid token" }, 401);
			}
			return c.json({ message: "Invalid token" }, 401);
		}
	} catch (err) {
		console.error("Authentication error:", err);
		return c.json({ message: "Internal server error" }, 500);
	}
};
