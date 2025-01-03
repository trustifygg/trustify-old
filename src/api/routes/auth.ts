import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { deleteCookie, setCookie } from 'hono/cookie';
import { exchangeCode, getUserData } from '../../utils/discord';
import { authenticate } from '../middlewares/authMiddlewares';
import { type IUser, userModel } from '../../models/users';
import type { Variables } from '../..';
import type { CookieOptions } from 'hono/utils/cookie';
import { Logger } from '../../utils/logger';

const authRoute = new Hono<{ Variables: Variables }>();

export const JWT_COOKIE_OPTIONS: CookieOptions = {
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'lax',
	path: '/',
	maxAge: 7 * 24 * 60 * 60 * 1000,
};

authRoute.get('/login', (c) => {
	if (!Bun.env.DISCORD_CLIENT_ID || !Bun.env.DISCORD_REDIRECT_URI) {
		return c.json({ message: 'Discord OAuth configuration missing' }, 500);
	}

	const DISCORD_OAUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${
		Bun.env.DISCORD_CLIENT_ID
	}&redirect_uri=${encodeURIComponent(
		Bun.env.DISCORD_REDIRECT_URI
	)}&response_type=code&scope=identify%20email%20guilds`;

	return c.redirect(DISCORD_OAUTH_URL);
});

authRoute.get('/callback', async (c) => {
	try {
		const { code } = c.req.query();

		if (!code || typeof code !== 'string') {
			return c.json({ message: 'No authorization code provided' }, 400);
		}

		const tokens = await exchangeCode(code);
		const userData = await getUserData(tokens.access_token);

		const userUpdate: Partial<IUser> = {
			userId: userData.id,
			username: userData.username,
			email: userData.email,
			avatar: userData.avatar || '',
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
		};

		const user = await userModel.findOneAndUpdate({ userId: userData.id }, userUpdate, {
			upsert: true,
			new: true,
			select: '+accessToken +refreshToken',
		});

		if (!user) {
			return c.json({ message: 'Failed to create/update user' }, 500);
		}

		const session = c.get('session');

		const sessionUser: IUser = {
			userId: user.userId,
			username: user.username,
			email: user.email,
			avatar: user.avatar,
			accessToken: user.accessToken,
			refreshToken: user.refreshToken,
		};

		session.user = sessionUser;

		if (!Bun.env.JWT_SECRET) {
			return c.json({ message: 'JWT secret is not set' }, 500);
		}

		const token = await sign(
			{
				userId: user.userId,
				exp: Math.floor(Date.now() / 1000) + 604800,
			},
			Bun.env.JWT_SECRET
		);

		setCookie(c, 'token', token, {
			...JWT_COOKIE_OPTIONS,
			path: '/',
			maxAge: 60 * 60 * 24 * 7,
		});

		return c.redirect(Bun.env.WEBSITE_URL!);
	} catch (err) {
		Logger.error('Auth callback error:' + err);
		return c.redirect(Bun.env.WEBSITE_URL!);
	}
});

authRoute.get('/logout', authenticate, (c) => {
	try {
		c.set('session', { user: undefined });
		deleteCookie(c, 'token');
		c.redirect(Bun.env.WEBSITE_URL!);
		return c.json({ message: 'Logged out successfully' });
	} catch (err) {
		Logger.error('Logout error:' + err);
		return c.json({ message: 'Logout failed' }, 500);
	}
});

export default authRoute;
