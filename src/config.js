import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const requiredEnv = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_GUILD_ID",
  "VOTE_CHANNEL_ID"
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

let firebaseConfig;

function loadFirebaseConfig() {
  if (firebaseConfig) {
    return firebaseConfig;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

    firebaseConfig = {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key
    };
    return firebaseConfig;
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    };
    return firebaseConfig;
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    path.join(process.cwd(), "firebase-service-account.json");

  if (!existsSync(serviceAccountPath)) {
    throw new Error(
      "Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON, or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY. For local development, you can also set FIREBASE_SERVICE_ACCOUNT_PATH to a service account JSON file."
    );
  }

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

  firebaseConfig = {
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key
  };
  return firebaseConfig;
}

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  voteChannelId: process.env.VOTE_CHANNEL_ID,
  enableWelcomeMessages: process.env.ENABLE_WELCOME_MESSAGES === "true",
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID,
  get firebase() {
    return loadFirebaseConfig();
  }
};
