import http from "node:http";
import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { startBackgroundMusic } from "./background-music.js";
import { commandMap, handleVoteButton } from "./commands.js";
import { config } from "./config.js";

const intents = [GatewayIntentBits.Guilds];

if (config.enableWelcomeMessages) {
  intents.push(GatewayIntentBits.GuildMembers);
}

const client = new Client({
  intents
});

const welcomeMessages = [
  "hi {user}, hope you brought pizza.",
  "yo {user}, the server just got better.",
  "welcome {user}, excellent choice showing up here.",
  "hey {user}, your timing is suspiciously perfect.",
  "hi {user}, grab a seat and pretend you know what's going on."
];

function createWelcomeMessage(member) {
  const message = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
  return message.replace("{user}", `<@${member.id}>`);
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  try {
    await startBackgroundMusic(readyClient);
  } catch (error) {
    console.error("Failed to start background music:", error);
  }
});

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({
      ok: true,
      botReady: client.isReady(),
      uptime: process.uptime()
    }));
    return;
  }

  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("Bro Bot is running.");
});

const port = process.env.PORT ?? 3000;
server.listen(port, () => {
  console.log(`Health server listening on port ${port}`);
});

client.on(Events.GuildMemberAdd, async (member) => {
  if (!config.enableWelcomeMessages) {
    return;
  }

  if (!config.welcomeChannelId) {
    return;
  }

  if (member.guild.id !== config.guildId) {
    return;
  }

  try {
    const channel = await client.channels.fetch(config.welcomeChannelId);

    if (!channel?.isTextBased()) {
      console.error(`Welcome channel ${config.welcomeChannelId} is not a text channel or could not be found.`);
      return;
    }

    await channel.send(createWelcomeMessage(member));
  } catch (error) {
    console.error(`Error while sending welcome message for ${member.id}:`, error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    try {
      await handleVoteButton(interaction);
    } catch (error) {
      console.error(`Error while handling button ${interaction.customId}:`, error);

      const response = {
        content: "Something went wrong while recording that vote.",
        flags: MessageFlags.Ephemeral
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = commandMap.get(interaction.commandName);

  if (!command) {
    await interaction.reply({
      content: "Unknown command.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error while running /${interaction.commandName}:`, error);

    const response = {
      content: "Something went wrong while running that command.",
      flags: MessageFlags.Ephemeral
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response);
    } else {
      await interaction.reply(response);
    }
  }
});

client.login(config.token);
