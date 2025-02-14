import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
	.setName("ping")
	.setDescription("Check the response time of the bot");

export async function execute(interaction: ChatInputCommandInteraction) {
	let sent = await interaction.reply({
		content: `🏓 Pong!`,
		fetchReply: true,
	});
	try {
		sent.edit(
			`🏓 Pong! \`|\` Heartbeat : **${
				interaction.client.ws.ping
			}ms** \`|\` Roundtrip latency : **${
				sent.createdTimestamp - interaction.createdTimestamp
			}ms**.`
		);
	} catch (e) {}
}
