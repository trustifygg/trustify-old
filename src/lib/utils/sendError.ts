import { inspect } from 'bun';
import { Client, WebhookClient, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { Logger } from './logger';

const trim = <T extends string | null | undefined>(str: T, max: number): T => {
	if (!str) return str;
	const trimmedStr = str.length > max ? `${str.slice(0, max - 3)}...` : str;
	return trimmedStr as T;
};

export const sendError = (error: Error, name: string) => {
	Logger.error(error);
	if (Bun.env.NODE_ENV !== 'production') return;

	const wh = new WebhookClient({
		url: Bun.env.ERROR_WEBHOOK_URL!,
	});
	const completeError = inspect(error, { depth: 0 });
	const embed = new EmbedBuilder()
		.setColor(0xff0000)
		.setTitle(name)
		.addFields(
			{
				name: 'Error: ',
				value: `\`${error}\``,
			},
			{
				name: 'Stack: ',
				value: `\`\`\`ps
        ${trim(completeError, 900)}\`\`\`
        `,
			}
		);

	const attachment = new AttachmentBuilder(Buffer.from(`${completeError}`, 'utf8'), {
		name: 'error.log',
	}).setDescription(`${name} error log`);
	void wh.send({
		username: 'Error',
		avatarURL: "",
		content: `<@&1180530000374542386> ${error}`,
		embeds: [embed],
		files: [attachment],
	});
};
