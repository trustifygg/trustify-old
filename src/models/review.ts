import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
	guildId: {
		type: String,
		required: true,
		index: true,
	},
	reviewId: {
		type: String,
		required: true,
		unique: true,
	},
	authorId: {
		type: String,
		required: true,
	},
	messageId: {
		type: String,
		unique: true,
		sparse: true,
	},
	threadId: { type: String, required: false },
	review: {
		type: String,
		required: true,
	},
	rating: {
		type: Number,
		required: true,
		min: 1,
		max: 5,
	},
	anonymousReview: {
		type: Boolean,
		default: false,
	},
	attachment: { type: String },
	useful: {
		count: { type: Number, default: 0, required: true },
		users: { type: [String], default: [], required: true },
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	editedAt: {
		type: Date,
		default: null,
	},
});

export const reviewModel = mongoose.model('ReviewsDB', reviewSchema, 'Reviews');

export interface IReview extends mongoose.Document {
	guildId: string;
	reviewId: string;
	authorId: string;
	messageId?: string;
	threadId?: string;
	review: string;
	rating: number;
	anonymousReview: boolean;
	useful: { count: number; users: string[] };
	createdAt: Date;
	editedAt: Date | null;
	attachment: string;
}
