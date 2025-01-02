import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, version as discordVersion, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { reviewModel } from '../models/review';
import { guildModel } from '../models/guild';
import { DEFAULT_EMBED_COLOR, DEFAULT_FOOTER, BOT_NAME, BOT_VERSION, DEVELOPERS } from '../constants';

export const data = new SlashCommandBuilder()
  .setName('botinfo')
  .setDescription('View bot information and statistics');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  // Fetch statistics from MongoDB
  const totalReviews = await reviewModel.countDocuments();
  const totalServers = await guildModel.countDocuments();
  const averageRating = await reviewModel.aggregate([
    { $group: { _id: null, avg: { $avg: '$rating' } } }
  ]);

  const avgRating = averageRating[0]?.avg?.toFixed(1) || '0.0';

  // Calculate uptime
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  const embed = new EmbedBuilder()
    .setColor(DEFAULT_EMBED_COLOR)
    .setAuthor({
      name: `${BOT_NAME} Information`,
      iconURL: interaction.client?.user?.displayAvatarURL() ?? undefined
    })
    .setDescription(
      `${BOT_NAME} - Simplifying reviews\n\n` +
      `**📊 Statistics**\n` +
      `> Servers: \`${interaction.client.guilds.cache.size.toLocaleString()}\`\n` +
      `> Reviews: \`${totalReviews.toLocaleString()}\`\n` +
      `> Average Rating: \`⭐ ${avgRating}/5\`\n\n` +
      `**⚙️ Technical**\n` +
      `> Version: \`${BOT_VERSION}\`\n` +
      `> Discord.js: \`v${discordVersion}\`\n` +
      `> Uptime: \`${days}d ${hours}h ${minutes}m\`\n\n` +
      `**👨‍💻 Development**\n` +
      DEVELOPERS.map(dev => `> ${dev.name} • \`${dev.id}\``).join('\n')
    )
    .setThumbnail(interaction.client?.user?.displayAvatarURL() ?? undefined)

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Invite Me')
        .setURL('https://trustify.gg/invite')
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('Support Server')
        .setURL('https://trustify.gg/support')
        .setStyle(ButtonStyle.Link)
    );

  return interaction.editReply({ 
    embeds: [embed],
    components: [row]
  });
} 