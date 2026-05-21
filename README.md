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
- `/vote theme:<theme>`: posts a Bros Jam theme suggestion in the vote channel with `Aye!`, `Nay!`, and `No opinion.` buttons
- `/help`: lists available commands

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
   ```

## Discord Developer Portal Checklist

Create an application at <https://discord.com/developers/applications>, add a bot, then invite it to your server with these scopes:

- `bot`
- `applications.commands`

For this starter bot, the bot permission integer can be `0` because it only responds to slash commands.
# brobot
