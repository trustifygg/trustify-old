import { Client, Events, REST, Routes, ActivityType } from 'discord.js';
import { Logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

export const event = {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    if (!client.user || !client.application) {
      return;
    }

    // Set up rotating status
    let currentStatus = 0;
    const statuses = [
      {
        type: ActivityType.Custom,
        name: '💚 Simplifying reviews'
      },
      {
        type: ActivityType.Custom,
        name: `💚 ${client.guilds.cache.size} servers`
      }
    ];

    // Initial status
    if (client.user) {
      client.user.setActivity(statuses[0].name, { type: statuses[0].type });

      // Rotate status every 30 seconds
      setInterval(() => {
        currentStatus = (currentStatus + 1) % statuses.length;
        client.user?.setActivity(statuses[currentStatus].name, { 
          type: statuses[currentStatus].type 
        });
      }, 30000);
    }

    // Get all command data and register commands
    const commands = [];
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      if ('data' in command) {
        commands.push(command.data.toJSON());
      }
    }

    try {
      Logger.info(`Started refreshing ${commands.length} application (/) commands.`);

      const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
      await rest.put(
        Routes.applicationCommands(client.application.id),
        { body: commands },
      );

      Logger.info(`Successfully reloaded ${commands.length} application (/) commands.`);
    } catch (error) {
      Logger.error(`Error refreshing commands: ${error}`);
    }

    Logger.info(`Ready! Logged in as ${client.user.tag}`);
  }
};

export default event; 