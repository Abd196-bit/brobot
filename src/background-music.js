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

let musicController;

function createMusicResource() {
  const resource = createAudioResource(config.musicFilePath, {
    inlineVolume: true
  });

  resource.volume.setVolume(config.musicVolume);
  return resource;
}

function hasHumanListeners(channel) {
  return channel.members.some((member) => !member.user.bot);
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

  const player = createAudioPlayer();
  let connection;
  let connectPromise;

  async function connectAndPlay() {
    if (connection) {
      if (player.state.status !== AudioPlayerStatus.Playing) {
        player.play(createMusicResource());
      }
      return;
    }

    if (connectPromise) {
      return connectPromise;
    }

    connectPromise = (async () => {
      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true
      });

      connection.subscribe(player);

      connection.on("error", (error) => {
        console.error("Background music voice connection error:", error);
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 45_000);
      } catch (error) {
        connection.destroy();
        connection = undefined;
        console.error(
          `Timed out joining voice channel ${channel.name}. Check that the bot can View Channel, Connect, and Speak, and that the channel is a normal voice channel.`
        );
        throw error;
      } finally {
        connectPromise = undefined;
      }

      player.play(createMusicResource());
      console.log(`Background music playing in ${channel.name} at ${Math.round(config.musicVolume * 100)}% volume.`);
    })();

    return connectPromise;
  }

  function disconnectIfEmpty() {
    if (hasHumanListeners(channel)) {
      return false;
    }

    player.stop();

    if (connection) {
      connection.destroy();
      connection = undefined;
      console.log(`Background music stopped because ${channel.name} is empty.`);
    }

    return true;
  }

  player.on(AudioPlayerStatus.Idle, () => {
    if (!hasHumanListeners(channel)) {
      disconnectIfEmpty();
      return;
    }

    player.play(createMusicResource());
  });

  player.on("error", (error) => {
    console.error("Background music player error:", error);

    if (!hasHumanListeners(channel)) {
      disconnectIfEmpty();
      return;
    }

    player.play(createMusicResource());
  });

  musicController = {
    async sync() {
      if (hasHumanListeners(channel)) {
        await connectAndPlay();
        return;
      }

      disconnectIfEmpty();
    }
  };

  client.on("voiceStateUpdate", (oldState, newState) => {
    if (
      oldState.channelId !== config.musicVoiceChannelId &&
      newState.channelId !== config.musicVoiceChannelId
    ) {
      return;
    }

    musicController.sync().catch((error) => {
      console.error("Failed to update background music state:", error);
    });
  });

  if (hasHumanListeners(channel)) {
    await connectAndPlay();
  } else {
    console.log(`Background music waiting for listeners in ${channel.name}.`);
  }
}
