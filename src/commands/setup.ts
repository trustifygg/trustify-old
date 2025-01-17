import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
	type ColorResolvable,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ApplicationIntegrationType,
} from 'discord.js';
import { guildModel } from '../models/guild';
import { DEFAULT_EMBED_COLOR, DEFAULT_FOOTER, ERRORS, BOT_NAME } from '../constants';
import { logReview } from '../events/reviewLog';
import { validateHex } from '../lib/utils/validateHex';

export const data = new SlashCommandBuilder()
	.setName('setup')
	.setDescription('Setup server review settings')
	.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
	.setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
	.addChannelOption((option) =>
		option.setName('review_channel').setDescription('Channel for reviews').setRequired(true)
	)
	.addChannelOption((option) =>
		option.setName('logs_channel').setDescription('Channel for review logs').setRequired(true)
	)
	.addBooleanOption((option) => option.setName('review_button').setDescription('Show review button').setRequired(false))
	.addBooleanOption((option) =>
		option.setName('useful_button').setDescription('Show useful button on reviews').setRequired(false)
	)
	.addRoleOption((option) =>
		option.setName('admin_role').setDescription('Role that can manage reviews').setRequired(false)
	)
	.addBooleanOption((option) =>
		option.setName('create_threads').setDescription('Create discussion threads for reviews').setRequired(false)
	)
	.addStringOption((option) =>
		option
			.setName('review_title')
			.setDescription('Custom title for reviews (e.g., "New Review", "Feedback")')
			.setRequired(false)
	)
	.addBooleanOption((option) =>
		option.setName('force_anonymous').setDescription('Force all reviews to be anonymous').setRequired(false)
	)
	.addStringOption((option) =>
		option.setName('embed_color').setDescription('Custom color for embeds (hex code)').setRequired(false)
	)
	.addStringOption((option) =>
		option.setName('footer_text').setDescription('Custom footer text for embeds').setRequired(false)
	);

export async function execute(interaction: ChatInputCommandInteraction) {
	const guild = interaction.guild;

	if (!guild) {
		return interaction.reply({
			content: ERRORS.GUILD_ONLY,
			flags: ['Ephemeral'],
		});
	}

	let guildData = await guildModel.findOne({ guildId: guild.id });

	if (!guildData) {
		guildData = new guildModel({
			guildId: guild.id,
			name: guild.name,
			iconURL: guild.iconURL(),
		});

		await guildData.save();
	}

	if (guildData.channel && guildData.logsChannel) {
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setLabel('Go to Dashboard')
				.setEmoji('🌐')
				.setURL(`https://www.trustify.gg/dashboard/${guild.id}`)
				.setStyle(ButtonStyle.Link)
		);

		return interaction.reply({
			content: 'This server is already set up! Visit our dashboard to configure settings.',
			components: [row],
			flags: ['Ephemeral'],
		});
	}

	const reviewTitle = interaction.options.getString('review_title');
	const reviewChannel = interaction.options.getChannel('review_channel', true);
	const logsChannel = interaction.options.getChannel('logs_channel', true);
	const forceAnonymous = interaction.options.getBoolean('force_anonymous', false);
	const createThreads = interaction.options.getBoolean('create_threads', false);
	const reviewButton = interaction.options.getBoolean('review_button', false);
	const usefulButton = interaction.options.getBoolean('useful_button', false);
	const embedColor = interaction.options.getString('embed_color', false);
	if (embedColor) {
		if (!validateHex(embedColor)) {
			return interaction.reply({
				content:
					'Invalid hex color! Please use a valid hex color code (e.g., #5865F2).\nYou can pick a color here: https://htmlcolorcodes.com/color-picker/',
				ephemeral: true,
			});
		}
	}
	const footerText = interaction.options.getString('footer_text', false);
	const blacklistRole = interaction.options.getRole('blacklist_role', false);

	const updateData: any = {
		guildId: guild.id,
		name: guild.name,
		iconURL: guild.iconURL(),
		channel: reviewChannel.id,
		logsChannel: logsChannel.id,
		reviewButton: reviewButton,
		usefulButton: usefulButton,
		customEmbed: {
			color: embedColor || '#5865F2',
			footer: {
				text: footerText || DEFAULT_FOOTER,
			},
		},
	};

	// Update data if options are provided
	if (reviewTitle) updateData.reviewTitle = reviewTitle;
	if (forceAnonymous !== null) updateData.forceAnonymousReviews = forceAnonymous;
	if (createThreads !== null) updateData.createThreads = createThreads;
	if (blacklistRole) {
		const currentBlacklist = guildData?.blacklistedRoles || [];
		if (!currentBlacklist.includes(blacklistRole.id)) {
			updateData.blacklistedRoles = [...currentBlacklist, blacklistRole.id];
		}
	}

	guildData = await guildModel.findOneAndUpdate({ guildId: guild.id }, updateData, { upsert: true, new: true });

	// Verify log channel is text based
	if (!('isTextBased' in logsChannel) || !logsChannel.isTextBased()) {
		return interaction.reply({
			content: ERRORS.LOGS_TEXT_ONLY,
			flags: ['Ephemeral'],
		});
	}

	if (!guildData) {
		return interaction.reply({
			content: ERRORS.SETUP_FAILED,
			flags: ['Ephemeral'],
		});
	}

	const embed = new EmbedBuilder()
		.setColor(embedColor ? parseInt(embedColor.replace('#', ''), 16) : DEFAULT_EMBED_COLOR)
		.setTitle('Server Review Settings Updated')
		.addFields(
			{
				name: 'General Settings',
				value: [
					`Review Title: ${guildData.reviewTitle}`,
					`Review Channel: ${guildData.channel ? `<#${guildData.channel}>` : 'Not set'}`,
					`Logs Channel: ${guildData.logsChannel ? `<#${guildData.logsChannel}>` : 'Not set'}`,
				].join('\n'),
				inline: false,
			},
			{
				name: 'Features',
				value: [
					`Force Anonymous: ${guildData.forceAnonymousReviews ? '✅' : '❌'}`,
					`Create Threads: ${guildData.createThreads ? '✅' : '❌'}`,
					`Review Button: ${guildData.reviewButton ? '✅' : '❌'}`,
					`Useful Button: ${guildData.usefulButton ? '✅' : '❌'}`,
				].join('\n'),
				inline: true,
			},
			{
				name: 'Roles',
				value: [
					`Review Roles: ${
						guildData.reviewRoles.length ? guildData.reviewRoles.map((id) => `<@&${id}>`).join(', ') : 'None'
					}`,
					`Blacklisted Roles: ${
						guildData.blacklistedRoles.length ? guildData.blacklistedRoles.map((id) => `<@&${id}>`).join(', ') : 'None'
					}`,
				].join('\n'),
				inline: true,
			}
		)
		.setFooter({
			text: guildData.customEmbed?.footer?.text || DEFAULT_FOOTER,
			iconURL: guild.iconURL() ?? undefined,
		});

	// Log setup changes
	if (guildData.logsChannel) {
		await logReview(
			guild.id,
			`⚙️ **Server Settings Updated**
      Updated by: ${interaction.user.tag} (${interaction.user.id})
      Changes:
      ${Object.keys(updateData)
				.filter((key) => key !== 'guildId' && key !== 'name' && key !== 'iconURL')
				.map((key) => `- ${key}: ${updateData[key]}`)
				.join('\n')}`
		);
	}

	if (guildData.channel) {
		const channel = await guild.channels.fetch(guildData.channel);
		if (channel?.isTextBased()) {
			const welcomeEmbed = new EmbedBuilder()
				.setColor(embedColor ? parseInt(embedColor.replace('#', ''), 16) : DEFAULT_EMBED_COLOR)
				.setDescription(
					"To submit a Review, click the 'Submit Review' button below.\n\nProvide a rating (1-5) and share your experience with the server."
				)
				.setAuthor({
					name: BOT_NAME,
					iconURL: interaction.client.user?.displayAvatarURL() ?? undefined,
				})
				.setThumbnail(interaction.client.user?.displayAvatarURL() ?? undefined);

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setCustomId('submit_review').setLabel('Submit Review').setStyle(ButtonStyle.Primary)
			);

			await channel.send({
				embeds: [welcomeEmbed],
				components: [row],
			});
		}
	}

	return interaction.reply({ embeds: [embed], flags: ['Ephemeral'] });
}
