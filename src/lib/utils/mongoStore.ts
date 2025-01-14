import type { Store, SessionData } from 'hono-sessions';
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
	id: String,
	data: Object,
	expiresAt: Date,
});

const SessionModel = mongoose.model('Session', sessionSchema);

export class MongoStore implements Store {
	async getSessionById(sessionId?: string): Promise<SessionData | null | undefined> {
		if (!sessionId) return null;
		const session = await SessionModel.findOne({
			id: sessionId,
			expiresAt: { $gt: new Date() },
		});
		return session?.data as SessionData;
	}

	async createSession(sessionId: string, initialData: SessionData): Promise<void> {
		const expiresAt = new Date(Date.now() + 604800 * 1000);
		await SessionModel.create({ id: sessionId, data: initialData, expiresAt });
	}

	async persistSessionData(sessionId: string, data: SessionData): Promise<void> {
		await SessionModel.findOneAndUpdate({ id: sessionId }, { data });
	}

	async deleteSession(sessionId: string): Promise<void> {
		await SessionModel.deleteOne({ id: sessionId });
	}
}
