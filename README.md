# Bro Bot

A small Discord bot using `discord.js`.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill in `.env`:

   - `DISCORD_TOKEN`: bot token from the Discord Developer Portal
   - `DISCORD_PUBLIC_KEY`: application public key from the Discord Developer Portal, required for the `/interactions` wake endpoint
   - `DISCORD_CLIENT_ID`: application ID from the Discord Developer Portal
   - `DISCORD_GUILD_ID`: server ID for quick slash-command testing
   - `VOTE_CHANNEL_ID`: channel ID where Bros Jam votes should be posted
   - `ENABLE_WELCOME_MESSAGES`: set to `true` only if you enabled Discord's Server Members Intent
   - `WELCOME_CHANNEL_ID`: optional channel ID where new member welcome messages should be posted
   - `MUSIC_VOICE_CHANNEL_ID`: optional voice channel ID where the bot should loop background music
   - `MUSIC_FILE_PATH`: optional absolute path to an audio file the bot is allowed to play
   - `MUSIC_VOLUME`: optional music volume. Use `0.5` for 50%
   - `FIREBASE_SERVICE_ACCOUNT_PATH`: local path to your Firebase service account JSON, usually `firebase-service-account.json`

4. Deploy slash commands to your test server:

   ```bash
   npm run deploy
   ```

5. Start the bot:

   ```bash
   npm start
   ```

## Commands

- `/ping`: replies with bot latency
- `/vote theme:<theme>`: posts a Bros Jam theme vote using the voting period from `vote-period.txt`
- `/tutorial topic:<topic>`: shows a quick Bros Jam tutorial. Topics are `Overview`, `Theme voting`, `Building`, and `Submitting`
- `/joinmusic`: shows the voice channel where users can listen to background music
- `/clear message:<amount>`: deletes up to 100 recent messages from the channel where it is used. Admins only
- `/server`: shows basic server info
- `/user member:<member>`: shows user info
- `/avatar member:<member>`: shows a user's avatar
- `/coinflip`: flips a coin
- `/roll sides:<sides> count:<count>`: rolls dice
- `/help`: lists available commands

Each Discord user can suggest only one theme. Users can still change their vote on a theme as many times as they want; clicking `Aye!`, `Nay!`, or `No opinion.` moves their user ID between those fields.

## Background Music

Discord bots cannot play audio when someone only opens or views a server. The bot must join a voice channel and play audio there.

Set these values to loop background music at 50% volume:

```env
MUSIC_VOICE_CHANNEL_ID=your_voice_channel_id
MUSIC_FILE_PATH=/absolute/path/to/audio.mp3
MUSIC_VOLUME=0.5
```

The bot needs **Connect** and **Speak** permissions in that voice channel. Use an audio file you have the right to play.

## Voting Period

Users do not type the voting times. Edit [vote-period.txt](/Users/folder1/Desktop/bro bot/vote-period.txt) instead:

```text
from=2026-05-21 18:00
to=2026-05-21 20:00
```

Every `/vote` uses that period. Button clicks only count from `from` until `to`.

## Vote Storage

Votes are saved in Firebase Firestore, in the `votes` collection. Each theme suggestion is one Firestore document. Button clicks edit that same document instead of creating separate vote documents.

Each saved vote document uses the Discord message ID as its document ID and includes:

```json
{
  "messageId": "discord_message_id",
  "theme": "Baggage",
  "suggestedById": "suggesting_user_id",
  "suggestedBy": "Simon",
  "createdAt": "05/21/26, 5:55 PM",
  "startDate": "05/21/26, 6:00 PM",
  "endDate": "05/21/26, 8:00 PM",
  "startsAt": 1779386400000,
  "endsAt": 1779393600000,
  "aye": ["user_id"],
  "nay": [],
  "noOpinion": []
}
```

`vote-period.txt` is still a text file and only controls when voting is open.

## Firebase Setup

1. Open [Firebase Console](https://console.firebase.google.com).
2. Create or select a project.
3. Go to **Build** -> **Firestore Database**.
4. Create a Firestore database.
5. Go to **Project settings** -> **Service accounts**.
6. Click **Generate new private key**.
7. In the downloaded JSON file, use:
   - `project_id` as `FIREBASE_PROJECT_ID`
   - `client_email` as `FIREBASE_CLIENT_EMAIL`
   - `private_key` as `FIREBASE_PRIVATE_KEY`

Do not commit the downloaded JSON file to GitHub.

For local use:

1. Copy `firebase-service-account.example.json` to `firebase-service-account.json`.
2. Paste your new regenerated Firebase service account JSON into `firebase-service-account.json`.
3. Keep this in `.env`:

   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json
   ```

`firebase-service-account.json` is ignored by git.

For Render, use environment variables instead of uploading a JSON file:

- Recommended: paste the entire downloaded service account JSON into `FIREBASE_SERVICE_ACCOUNT_JSON`.
- Alternative: set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` separately.

## Render Hosting

Do not host this gateway bot on Vercel. Vercel serverless functions stop after handling requests, but this bot must keep a Discord WebSocket connection open.

Use Render as a long-running web service.

1. Push this project to GitHub.
2. Open [Render](https://render.com).
3. Click **New** -> **Blueprint**.
4. Connect the GitHub repo.
5. Render will read `render.yaml`.
6. In Render, set these environment variables:

   ```env
   DISCORD_TOKEN=your_new_regenerated_token
   DISCORD_PUBLIC_KEY=your_application_public_key
   DISCORD_CLIENT_ID=1506997342518378677
   DISCORD_GUILD_ID=1506892029039345815
   VOTE_CHANNEL_ID=1507009214416162977
   ENABLE_WELCOME_MESSAGES=false
   WELCOME_CHANNEL_ID=your_welcome_channel_id
   MUSIC_VOICE_CHANNEL_ID=your_voice_channel_id
   MUSIC_FILE_PATH=/absolute/path/to/audio.mp3
   MUSIC_VOLUME=0.5
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
   ```

   Or set the Firebase fields separately:

   ```env
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_CLIENT_EMAIL=your_service_account_email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

7. Deploy the service.
8. Run this once from your local machine after the env vars are correct:

   ```bash
   npm run deploy
   ```

Render settings if creating the service manually:

- Service type: **Web Service**
- Runtime: **Node**
- Build command:

  ```bash
  npm ci
  ```

- Start command:

  ```bash
  npm start
  ```

- Health check path:

  ```text
  /health
  ```

The bot serves `/health` so Render can keep track of the running service.

Use a paid always-on Render plan if you want the bot online 24/7. Free web services can sleep.

### Render Wake on Slash Commands

Render free services can wake only from HTTP traffic. The bot exposes a Discord Interactions webhook for that:

```text
https://<your-render-service>.onrender.com/interactions
```

Set that URL in the Discord Developer Portal:

```text
Application -> General Information -> Interactions Endpoint URL
```

Then copy the application's **Public Key** into Render as:

```env
DISCORD_PUBLIC_KEY=your_application_public_key
```

When a slash command is used while Render is asleep, Discord sends an HTTP request to `/interactions`, which wakes the service. The first command after a long sleep can still fail if Render's cold start takes longer than Discord's interaction timeout, but the service should be awake for the next command.

## Cloudflare Containers Hosting

Do not deploy this bot to plain Cloudflare Workers or Pages. This bot needs a long-running Node process for the Discord gateway connection, and voice playback also needs a full Node/container runtime. Cloudflare support is configured through Cloudflare Containers:

- `Dockerfile` packages the Node bot.
- `wrangler.toml` deploys one container-backed Worker.
- `src/cloudflare-worker.js` routes requests to the bot container.
- A cron trigger calls `/health` every 15 minutes to keep the single bot container active.

Cloudflare Containers require a Workers Paid plan.

1. Log in to Cloudflare:

   ```bash
   npx wrangler login
   ```

2. Set the required secrets:

   ```bash
   npx wrangler secret put DISCORD_TOKEN
   npx wrangler secret put DISCORD_CLIENT_ID
   npx wrangler secret put DISCORD_GUILD_ID
   npx wrangler secret put VOTE_CHANNEL_ID
   npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON
   ```

   Or use the separate Firebase fields instead of `FIREBASE_SERVICE_ACCOUNT_JSON`:

   ```bash
   npx wrangler secret put FIREBASE_PROJECT_ID
   npx wrangler secret put FIREBASE_CLIENT_EMAIL
   npx wrangler secret put FIREBASE_PRIVATE_KEY
   ```

   Optional secrets:

   ```bash
   npx wrangler secret put WELCOME_CHANNEL_ID
   npx wrangler secret put MUSIC_VOICE_CHANNEL_ID
   ```

3. Deploy the Worker and container:

   ```bash
   npm run cf:deploy
   ```

4. Start the container after deploy:

   ```bash
   curl -X POST https://bro-bot.<your-workers-subdomain>.workers.dev/start
   ```

5. Check health:

   ```bash
   curl https://bro-bot.<your-workers-subdomain>.workers.dev/health
   ```

If the container is stopped by Cloudflare, call `/start` again. The scheduled health check keeps the selected container instance warm while the deployment is active, but this is still a serverless container platform rather than a traditional VPS.

Environment variables:

   ```env
   DISCORD_TOKEN=your_new_regenerated_token
   DISCORD_CLIENT_ID=1506997342518378677
   DISCORD_GUILD_ID=1506892029039345815
   VOTE_CHANNEL_ID=1507009214416162977
   ENABLE_WELCOME_MESSAGES=false
   WELCOME_CHANNEL_ID=your_welcome_channel_id
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
   ```

Or set the Firebase fields separately:

   ```env
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_CLIENT_EMAIL=your_service_account_email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

## Discord Developer Portal Checklist

Create an application at <https://discord.com/developers/applications>, add a bot, then invite it to your server with these scopes:

- `bot`
- `applications.commands`

The bot needs the **Manage Messages** permission for `/clear`.
The bot needs **Connect** and **Speak** permissions for background music.

Only enable `ENABLE_WELCOME_MESSAGES=true` after enabling **Server Members Intent** under the bot's privileged gateway intents in the Discord Developer Portal. Otherwise Discord rejects the bot with `Used disallowed intents`.
# brobot
# brobot
# brobot
# brobot
