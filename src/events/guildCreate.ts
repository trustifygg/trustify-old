import { Events, EmbedBuilder, Guild } from 'discord.js';
import { DEFAULT_EMBED_COLOR } from '../constants';
import type { ColorResolvable } from 'discord.js';
export const event = {
  name: Events.GuildCreate,
  once: false,
  async execute(guild: Guild) {
    const systemChannel = guild.systemChannel || guild.channels.cache.find(channel => 
      channel.isTextBased() && channel.permissionsFor(guild.members.me!)?.has('SendMessages')
    );

    if (!systemChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(DEFAULT_EMBED_COLOR as ColorResolvable)
      .setTitle('Thanks for adding Reviews.')
      .setDescription('To get started, please run the `/setup` command to configure your server.')
      .addFields(
        {
          name: '⚙️ First Steps',
          value: '1. Use `/setup` to configure Reviews settings\n2. Set up review channels and roles\n3. Customize Reviews appearance',
          inline: false
        },
        {
          name: '🔑 Important',
          value: 'No commands will work until the initial setup is complete.',
          inline: false
        }
      )
      .setFooter({ 
        text: 'Reviews - Simplifying reviews',
        iconURL: guild.client.user.displayAvatarURL()
      });

    await systemChannel.send({ embeds: [embed] });
  }
};

export default event; 