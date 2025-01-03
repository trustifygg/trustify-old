import { Hono } from 'hono';
import { authenticate } from '../middlewares/authMiddlewares';
import { guildModel } from '../../models/guild';
import { hasPermission } from '../middlewares/guildMiddleware';
import DiscordClient from '../../utils/client';
import { ActionRowBuilder, ButtonBuilder, ChannelType, EmbedBuilder } from 'discord.js';
import { Logger } from '../../utils/logger';

const guildsRoute = new Hono();

const client = DiscordClient.getInstance();

guildsRoute.get('/:guildId', authenticate, hasPermission, async (c) => {
	const guildId = c.req.param('guildId');

	const guildData = await guildModel.findOne({ guildId });

	if (!guildData) {
		return c.json({ message: 'Guild not found' }, 404);
	}

	const data = {
		id: guildData.guildId,
		name: guildData.name,
		icon: guildData.icon,
		channel: guildData.channel,
		logsChannel: guildData.logsChannel,
		reviewRoles: guildData.reviewRoles,
		blacklistedRoles: guildData.blacklistedRoles,
		anonymousReviews: guildData.anonymousReviews,
		forceAnonymousReviews: guildData.forceAnonymousReviews,
		createThreads: guildData.createThreads,
		reviewButton: guildData.reviewButton,
		usefulButton: guildData.usefulButton,
		ratingEmoji: guildData.ratingEmoji,
		reviewTitle: guildData.reviewTitle,
		customReviewButton: guildData.customReviewButton,
		customEmbed: guildData.customEmbed,
	};

	return c.json(data, 200);
});

guildsRoute.patch('/:guildId', authenticate, hasPermission, async (c) => {
	try {
		const guildId = c.req.param('guildId');
		const updates = await c.req.json();

		const updatedGuild = await guildModel.findOneAndUpdate({ guildId }, { $set: updates }, { new: true, upsert: true });

		return c.json(updatedGuild, 200);
	} catch (err) {
		Logger.error('Error updating settings:' + err);
		return c.json({ message: 'Internal server error' }, 500);
	}
});

guildsRoute.get('/:guildId/channels', authenticate, hasPermission, async (c) => {
	const guildId = c.req.param('guildId');
	const guild = await client.getGuild(guildId);

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404);
	}

	const channels = guild.channels.cache
		.filter((channel) => channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)
		.map((channel) => ({
			id: channel.id,
			name: channel.name,
			type: channel.type,
		}));

	if (!channels) {
		return c.json({ message: 'Channels not found' }, 404);
	}

	return c.json(channels, 200);
});

guildsRoute.get('/:guildId/roles', authenticate, hasPermission, async (c) => {
	const guildId = c.req.param('guildId');

	const guild = await client.getGuild(guildId);

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404);
	}

	const roles = await guild.roles.fetch();

	if (!roles) {
		return c.json({ message: 'Roles not found' }, 404);
	}

	const filteredRoles = roles
		.filter((role) => !role.managed && role.id !== guild.id)
		.map((role) => ({
			id: role.id,
			name: role.name,
			color: role.hexColor,
			position: role.position,
		}))
		.sort((a, b) => b.position - a.position);

	return c.json(filteredRoles, 200);
});

guildsRoute.post('/:guildId/panel', authenticate, async (c) => {
	const guildId = c.req.param('guildId');
	const panelData = await c.req.json();

	const guild = await client.getGuild(guildId);

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404);
	}

	const guildData = await guildModel.findOne({ guildId });

	if (!guildData) {
		return c.json({ message: 'Guild not found' }, 404);
	}

	const buttonStyleMap = {
		blurple: 1,
		grey: 2,
		green: 3,
		red: 4,
	};

	const channel = await client.getChannel(panelData.channelId);

	if (!channel || channel.type !== ChannelType.GuildText) {
		return c.json({ message: 'Invalid channel' });
	}

	const buttons = new ActionRowBuilder<ButtonBuilder>().setComponents(
		new ButtonBuilder()
			.setLabel(guildData.customReviewButton?.label || 'Submit Review')
			.setStyle(buttonStyleMap[panelData.customReviewButton.color as keyof typeof buttonStyleMap])
			.setCustomId('writeReview')
	);

	const embed = new EmbedBuilder()
		.setColor(panelData.color)
		.setTitle(panelData.title)
		.setDescription(panelData.description)
		.setFooter({ text: panelData.footer })
		.setThumbnail(panelData.thumbnail)
		.setImage(panelData.image);

	for (const field of panelData.fields) {
		embed.addFields({
			name: field.name,
			value: field.value,
			inline: field.inline,
		});
	}

	await channel.send({
		embeds: [embed],
		components: [buttons],
	});
});

export default guildsRoute;
