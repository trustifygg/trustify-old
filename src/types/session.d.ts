import { IUser } from "../db/models/user";

export interface SessionUser {
	userId: string;
	username: string;
	email: string;
	avatar: string;
	accessToken: string;
	refreshToken: string;
}

export interface SessionData {
	user?: SessionUser;
}

declare module "hono" {
	interface Context {
		session: SessionData;
	}
}
