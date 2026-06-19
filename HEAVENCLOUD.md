# HeavenCloud Hosting

This bot is ready for HeavenCloud as a Node.js Discord bot.

## Required Settings

- Runtime/language: Node.js
- Install/build command: `npm ci`
- Start command: `npm start`
- Main file, if the panel asks for one: `index.js`
- Health check path, if available: `/health`

## Upload

Upload the project through the HeavenCloud panel using ZIP, SFTP, or Git.

Do not upload these local-only files:

- `.env`
- `node_modules/`
- `firebase-service-account.json`
- `.git/`

The panel should install dependencies from `package-lock.json` with `npm ci`.

## Environment Variables

Set these in the HeavenCloud control panel:

```env
DISCORD_TOKEN=your_new_regenerated_token
DISCORD_PUBLIC_KEY=your_application_public_key
DISCORD_CLIENT_ID=your_application_id
DISCORD_GUILD_ID=your_server_id
VOTE_CHANNEL_ID=your_vote_channel_id
ENABLE_WELCOME_MESSAGES=false
WELCOME_CHANNEL_ID=your_welcome_channel_id
MUSIC_VOICE_CHANNEL_ID=your_voice_channel_id
MUSIC_FILE_PATH=/home/container/My Ordinary Life-The Living Tombstone.mp3
MUSIC_VOLUME=0.5
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
```

If the panel has trouble with a full JSON value, set these instead of `FIREBASE_SERVICE_ACCOUNT_JSON`:

```env
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Slash Commands

After the bot is uploaded and the environment variables are set, run this once from your local machine or from the HeavenCloud console:

```bash
npm run deploy
```

Then start or restart the server in the HeavenCloud panel.
