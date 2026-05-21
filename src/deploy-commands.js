import { REST, Routes } from "discord.js";
import { commandData } from "./commands.js";
import { config } from "./config.js";

const rest = new REST({ version: "10" }).setToken(config.token);

try {
  console.log(`Deploying ${commandData.length} slash commands...`);

  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commandData }
  );

  console.log("Slash commands deployed.");
} catch (error) {
  console.error("Failed to deploy slash commands:");
  console.error(error);
  process.exitCode = 1;
}
