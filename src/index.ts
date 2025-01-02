import { config } from 'dotenv';
import { Client, GatewayIntentBits, Collection, ChatInputCommandInteraction } from 'discord.js';
import { connectToDatabase } from './config/mongodb';
import fs from 'fs';
import path from 'path';
import { setClient } from './events/reviewLog';
import { createReviewModal, handleUsefulButton } from './components/reviewButtons';
import { requireSetup } from './utils/checkSetup';

config();
connectToDatabase();

interface ExtendedClient extends Client {
  commands: Collection<string, { 
    data: { name: string }; 
    execute: (interaction: ChatInputCommandInteraction) => Promise<void> 
  }>;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] }) as ExtendedClient;
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const { event } = require(filePath);
  
  if (!event) continue;

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      // Check setup before executing any command
      if (!(await requireSetup(interaction))) return;
      
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: 'There was an error executing this command!', 
          ephemeral: true 
        });
      }
    }
  } 
  
  // Handle button clicks
  else if (interaction.isButton()) {
    if (interaction.customId !== 'submit_review' && !(await requireSetup(interaction as any))) return;
    
    if (interaction.customId === 'submit_review') {
      const modal = createReviewModal();
      await interaction.showModal(modal);
    } 
    else if (interaction.customId.startsWith('useful_')) {
      await handleUsefulButton(interaction);
    }
  }
  
  // Handle modal submissions
  else if (interaction.isModalSubmit() && interaction.customId === 'review_modal') {
    const reviewContent = interaction.fields.getTextInputValue('review_content');
    const rating = parseInt(interaction.fields.getTextInputValue('review_rating'));

    if (isNaN(rating) || rating < 1 || rating > 5) {
      return interaction.reply({
        content: 'Please provide a valid rating between 1 and 5.',
        ephemeral: true
      });
    }

    const modifiedInteraction = {
      ...interaction,
      commandName: 'review',
      options: {
        getInteger: (name: string, required?: boolean) => name === 'stars' ? rating : null,
        getString: (name: string, required?: boolean) => name === 'message' ? reviewContent : null,
        get: () => null,
        getFocused: () => null,
        getMentionable: () => null,
        getAttachment: () => null,
        getBoolean: () => null,
        getChannel: () => null,
        getNumber: () => null,
        getRole: () => null,
        getSubcommand: () => null,
        getSubcommandGroup: () => null,
        getUser: () => null,
      },
      guild: interaction.guild,
      user: interaction.user,
      reply: interaction.reply.bind(interaction),
      deferReply: interaction.deferReply.bind(interaction),
      editReply: interaction.editReply.bind(interaction),
      deleteReply: interaction.deleteReply.bind(interaction),
      followUp: interaction.followUp.bind(interaction),
      isChatInputCommand: () => true
    } as ChatInputCommandInteraction;

    const command = client.commands.get('review');
    if (command) {
      try {
        await command.execute(modifiedInteraction);
      } catch (error) {
        console.error(error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'There was an error processing your review!',
            ephemeral: true
          });
        }
      }
    }
  }
});

setClient(client);
client.login(process.env.DISCORD_TOKEN); 