import { type InferSchemaType, model, Schema } from 'mongoose';

const userSchema = new Schema({
	userId: { type: String, required: true, unique: true },
	username: { type: String, required: true },
	email: { type: String, required: true },
	avatar: { type: String, required: true },
	votedAt: { type: Date, required: false },

	accessToken: {
		type: String,
		required: true,
		select: false,
	},
	refreshToken: {
		type: String,
		required: true,
		select: false,
	},
});

export const userModel = model('UserDB', userSchema, 'Users');

export type IUser = InferSchemaType<typeof userSchema>;
