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

## 24/7 Hosting

Do not host this gateway bot on Vercel. Vercel serverless functions stop after handling requests, but this bot must keep a Discord WebSocket connection open.

Use a long-running Node host instead, such as Railway, Render, Fly.io, or a VPS.

Recommended: Railway.

1. Push this project to GitHub.
2. Open Railway and create a new project from the GitHub repo.
3. Set these environment variables in the host dashboard:

   ```env
   DISCORD_TOKEN=your_new_regenerated_token
   DISCORD_CLIENT_ID=1506997342518378677
   DISCORD_GUILD_ID=1506892029039345815
   VOTE_CHANNEL_ID=1507009214416162977
   ```

4. Railway will use `railway.json`. If it asks for a start command, use:

   ```bash
   npm start
   ```

5. Open the Railway service shell or run locally once:

   ```bash
   npm run deploy
   ```

The bot also serves a health endpoint at `/health` for hosts that need an HTTP check.

Render can also work with `render.yaml`, but free web services may sleep. Use a paid always-on instance if you want the bot online 24/7.

## Discord Developer Portal Checklist

Create an application at <https://discord.com/developers/applications>, add a bot, then invite it to your server with these scopes:

- `bot`
- `applications.commands`

For this starter bot, the bot permission integer can be `0` because it only responds to slash commands.
# brobot
