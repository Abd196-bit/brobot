import { Container, getContainer } from "@cloudflare/containers";
import { env as workerEnv } from "cloudflare:workers";

const CONTAINER_ID = "bro-bot";

export class BroBotContainer extends Container {
  defaultPort = 3000;
  sleepAfter = "24h";
  envVars = {
    DISCORD_TOKEN: workerEnv.DISCORD_TOKEN,
    DISCORD_CLIENT_ID: workerEnv.DISCORD_CLIENT_ID,
    DISCORD_GUILD_ID: workerEnv.DISCORD_GUILD_ID,
    VOTE_CHANNEL_ID: workerEnv.VOTE_CHANNEL_ID,
    ENABLE_WELCOME_MESSAGES: workerEnv.ENABLE_WELCOME_MESSAGES ?? "false",
    WELCOME_CHANNEL_ID: workerEnv.WELCOME_CHANNEL_ID ?? "",
    MUSIC_VOICE_CHANNEL_ID: workerEnv.MUSIC_VOICE_CHANNEL_ID ?? "",
    MUSIC_VOLUME: workerEnv.MUSIC_VOLUME ?? "0.5",
    FIREBASE_PROJECT_ID: workerEnv.FIREBASE_PROJECT_ID ?? "",
    FIREBASE_CLIENT_EMAIL: workerEnv.FIREBASE_CLIENT_EMAIL ?? "",
    FIREBASE_PRIVATE_KEY: workerEnv.FIREBASE_PRIVATE_KEY ?? "",
    FIREBASE_SERVICE_ACCOUNT_JSON: workerEnv.FIREBASE_SERVICE_ACCOUNT_JSON ?? ""
  };
}

function getBotContainer(env) {
  return getContainer(env.BRO_BOT_CONTAINER, CONTAINER_ID);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const container = getBotContainer(env);

    if (url.pathname === "/start" && request.method === "POST") {
      await container.startAndWaitForPorts();

      return Response.json({
        ok: true,
        message: "Bro Bot container is starting."
      });
    }

    return container.fetch(request);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(getBotContainer(env).fetch("http://container.local/health"));
  }
};
