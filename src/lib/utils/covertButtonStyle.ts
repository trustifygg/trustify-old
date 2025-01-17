import { ButtonStyle } from 'discord.js';

export const convertButtonStyle = (style: string): ButtonStyle => {
	switch (style.toLowerCase()) {
		case 'blurple':
			return ButtonStyle.Primary;
		case 'grey':
			return ButtonStyle.Secondary;
		case 'green':
			return ButtonStyle.Success;
		case 'red':
			return ButtonStyle.Danger;
		default:
			return ButtonStyle.Primary;
	}
};
