import { model, Schema, type InferSchemaType } from 'mongoose';

const userSchema = new Schema({
	userId: { type: String, required: true },
	username: { type: String, required: true },
	avatarHash: { type: String, default: null },
	accessToken: { type: String, required: true },
	refreshToken: { type: String, required: true },
}, { timestamps: true});

export const userModel = model('UserDB', userSchema, 'Users');

export type IUser = InferSchemaType<typeof userSchema>;
