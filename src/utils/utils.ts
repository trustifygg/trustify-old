import {
	MAX_STARS,
	STAR_EMPTY,
	STAR_GREEN,
	STAR_RED,
	STAR_YELLOW,
} from "../constants";

export const getSeconds = (date: string | number | Date) =>
	Math.round(new Date(date).valueOf() / 1000);
export const getDynamicTime = (
	date: string | number | Date,
	style:
		| "SHORT_TIME"
		| "LONG_TIME"
		| "SHORT_DATE"
		| "LONG_DATE"
		| "TIME_AND_DATE"
		| "LONG_TIME_AND_DATE"
		| "RELATIVE"
) => {
	let type: string | undefined = undefined;

	switch (style) {
		case "SHORT_TIME":
			type = "t";
			break;
		case "LONG_TIME":
			type = "T";
			break;
		case "SHORT_DATE":
			type = "d";
			break;
		case "LONG_DATE":
			type = "D";
			break;
		case "TIME_AND_DATE":
			type = "f";
			break;
		case "LONG_TIME_AND_DATE":
			type = "F";
			break;
		case "RELATIVE":
			type = "R";
			break;
		default:
			break;
	}

	return `<t:${getSeconds(date)}:${type}>`;
};

export const generateReviewId = (): string => {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const getStarsDisplay = (count: number): string => {
	let starEmoji;
	if (count >= 4) {
		starEmoji = STAR_GREEN; // 4-5 stars = green
	} else if (count === 3) {
		starEmoji = STAR_YELLOW; // 3 stars = yellow
	} else {
		starEmoji = STAR_RED; // 1-2 stars = red
	}
	return starEmoji.repeat(count) + STAR_EMPTY.repeat(MAX_STARS - count);
};

export const formatNumber = (num: number): string => {
	return new Intl.NumberFormat("en-US").format(num);
};
