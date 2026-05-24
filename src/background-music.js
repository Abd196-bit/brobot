import { existsSync } from "node:fs";
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus
} from "@discordjs/voice";
import { PermissionFlagsBits } from "discord.js";
import { config } from "./config.js";

function createMusicResource() {
  const resource = createAudioResource(config.musicFilePath, {
    inlineVolume: true
  });

  resource.volume.setVolume(config.musicVolume);
  return resource;
}

export async function startBackgroundMusic(client) {
  if (!config.musicVoiceChannelId) {
    console.log("Background music disabled. Set MUSIC_VOICE_CHANNEL_ID to enable it.");
    return;
  }

  if (!existsSync(config.musicFilePath)) {
    console.error(`Background music file not found: ${config.musicFilePath}`);
    return;
  }

  const channel = await client.channels.fetch(config.musicVoiceChannelId);

  if (!channel?.isVoiceBased()) {
    console.error(`Music channel ${config.musicVoiceChannelId} is not a voice channel.`);
    return;
  }

  if (channel.guild.id !== config.guildId) {
    console.error(`Music channel ${channel.id} is not in the configured guild ${config.guildId}.`);
    return;
  }

  const botMember = await channel.guild.members.fetchMe();
  const permissions = channel.permissionsFor(botMember);

  if (!permissions?.has(PermissionFlagsBits.Connect)) {
    console.error(`Missing Connect permission for voice channel ${channel.name}.`);
    return;
  }

  if (!permissions.has(PermissionFlagsBits.Speak)) {
    console.error(`Missing Speak permission for voice channel ${channel.name}.`);
    return;
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true
  });
  const player = createAudioPlayer();

  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    player.play(createMusicResource());
  });

  player.on("error", (error) => {
    console.error("Background music player error:", error);
    player.play(createMusicResource());
  });

  connection.on("error", (error) => {
    console.error("Background music voice connection error:", error);
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 45_000);
  } catch (error) {
    connection.destroy();
    console.error(
      `Timed out joining voice channel ${channel.name}. Check that the bot can View Channel, Connect, and Speak, and that the channel is a normal voice channel.`
    );
    throw error;
  }

  player.play(createMusicResource());
  console.log(`Background music playing in ${channel.name} at ${Math.round(config.musicVolume * 100)}% volume.`);
}
