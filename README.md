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
   - `DISCORD_CLIENT_ID`: application ID from the Discord Developer Portal
   - `DISCORD_GUILD_ID`: server ID for quick slash-command testing
   - `VOTE_CHANNEL_ID`: channel ID where Bros Jam votes should be posted
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
- `/help`: lists available commands

## Voting Period

Users do not type the voting times. Edit [vote-period.txt](/Users/folder1/Desktop/bro bot/vote-period.txt) instead:

```text
from=2026-05-21 18:00
to=2026-05-21 20:00
```

Every `/vote` uses that period. Button clicks only count from `from` until `to`.

## Vote Storage

Votes are saved in Firebase Firestore, in the `votes` collection.

Each saved vote document uses the Discord message ID as its document ID and includes:

```json
{
  "messageId": "discord_message_id",
  "theme": "Baggage",
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
   DISCORD_CLIENT_ID=1506997342518378677
   DISCORD_GUILD_ID=1506892029039345815
   VOTE_CHANNEL_ID=1507009214416162977
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

Environment variables:

   ```env
   DISCORD_TOKEN=your_new_regenerated_token
   DISCORD_CLIENT_ID=1506997342518378677
   DISCORD_GUILD_ID=1506892029039345815
   VOTE_CHANNEL_ID=1507009214416162977
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_CLIENT_EMAIL=your_service_account_email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

## Discord Developer Portal Checklist

Create an application at <https://discord.com/developers/applications>, add a bot, then invite it to your server with these scopes:

- `bot`
- `applications.commands`

For this starter bot, the bot permission integer can be `0` because it only responds to slash commands.
# brobot
# brobot
# brobot
