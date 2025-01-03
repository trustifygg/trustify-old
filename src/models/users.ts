import { model, Schema, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
	{
		userId: { type: String, required: true },
		username: { type: String, required: true },
		email: { type: String, required: true },
		avatar: { type: String },
		votes: { type: Number, default: 0, required: false },

		accessToken: { type: String, required: true, select: false },
		refreshToken: { type: String, required: true, select: false },
	},
	{ timestamps: true }
);

export const userModel = model('UserDB', userSchema, 'Users');

export type IUser = InferSchemaType<typeof userSchema>;
