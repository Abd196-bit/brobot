import { existsSync } from "node:fs";
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus
} from "@discordjs/voice";
import { config } from "./config.js";

function createMusicResource() {
  const resource = createAudioResource(config.musicFilePath, {
    inlineVolume: true
  });

  resource.volume.setVolume(config.musicVolume);
  return resource;
}

export async function startBackgroundMusic(client) {
  if (!config.musicVoiceChannelId || !config.musicFilePath) {
    console.log("Background music disabled. Set MUSIC_VOICE_CHANNEL_ID and MUSIC_FILE_PATH to enable it.");
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

  await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
  player.play(createMusicResource());
  console.log(`Background music playing in ${channel.name} at ${Math.round(config.musicVolume * 100)}% volume.`);
}
