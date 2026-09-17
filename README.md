# Telegram Claude Bot

A Telegram bot that lets you chat with Claude, with a `/new` command to start a fresh
conversation, per-chat history management, and a fixed allow-list of Telegram user IDs who may
use the bot.

## Features

- Chat directly with Claude through Telegram messages, via any OpenAI-compatible API provider
  (e.g. [ModelVerse](https://astraflow.scloudsg.com/en-us/docs/modelverse)).
- `/new`: clears the current history and starts a new session.
- `/help`: view usage instructions.
- Each chat (user) has its own session, stored as a JSON file in `data/sessions/`, keeping the
  last `MAX_HISTORY_MESSAGES` messages to send as context to Claude.
- Full, permanent chat history is archived separately in `data/logs/<chatId>/<YYYY-MM-DD>.jsonl`
  (one JSON line per message, never trimmed), so nothing is lost even after `/new` or the
  session's history window rolls over.
- Access control (`ALLOWED_USER_IDS`): only the Telegram user IDs listed here can use the bot;
  everyone else is rejected immediately, no code or sign-up flow.

## Setup

```bash
npm install
cp .env.example .env
```

Edit the `.env` file:

- `TELEGRAM_BOT_TOKEN`: create a bot and get the token from [@BotFather](https://t.me/BotFather).
- `AI_API_KEY`: API key from your provider's console (e.g. ModelVerse).
- `AI_BASE_URL`: the provider's OpenAI-compatible base URL (default: ModelVerse).
- `ALLOWED_USER_IDS`: comma-separated Telegram user IDs allowed to use the bot (get your own ID
  by messaging [@userinfobot](https://t.me/userinfobot)).
- The remaining variables (`CLAUDE_MODEL`, `CLAUDE_MAX_TOKENS`, `SYSTEM_PROMPT`,
  `MAX_HISTORY_MESSAGES`, `DATA_DIR`) have sensible defaults; change them if needed.

To revoke a user, remove their ID from `ALLOWED_USER_IDS` and restart the bot.

## Running

Development mode (auto-restarts on code changes):

```bash
npm run dev
```

Build and run in production:

```bash
npm run build
npm start
```

## Running with Docker

Build and run with Docker Compose (recommended):

```bash
cp .env.example .env   # fill in the token/API key/allow-list first
docker compose up -d --build
```

View logs:

```bash
docker compose logs -f
```

Stop the bot:

```bash
docker compose down
```

Sessions are persisted outside the container via the `./data` volume, so they survive
restarts/rebuilds.

Or with plain Docker (no compose), using the prebuilt image from Docker Hub:

```bash
docker pull nightbarron/telegram-claude-bot:latest
docker run -d --name telegram-claude-bot \
  --env-file .env \
  -v "$(pwd)/data:/app/data" \
  --restart unless-stopped \
  nightbarron/telegram-claude-bot:latest
```

## CI/CD

On every push to `main` (or a `v*` tag), a GitHub Actions workflow
([.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml)) builds a
`linux/amd64` image and pushes it to Docker Hub as
[nightbarron/telegram-claude-bot](https://hub.docker.com/r/nightbarron/telegram-claude-bot).

It requires two repository secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN` (a Docker Hub access token with Read & Write permission)

## Structure

```
src/
  config.ts        # reads and validates environment variables
  types.ts         # Session and ChatMessage type definitions
  sessionStore.ts  # create/read/write/reset sessions, saved to data/sessions/<chatId>.json
  chatLog.ts       # append-only full history archive, data/logs/<chatId>/<date>.jsonl
  accessControl.ts # checks a user's Telegram ID against ALLOWED_USER_IDS
  claude.ts        # calls the configured OpenAI-compatible API (Claude model)
  bot.ts           # Telegraf command and handler definitions
  index.ts         # entrypoint, starts the bot
```

## Notes

- Sessions are stored per `chatId`, so each chat (e.g. each user chatting 1-1 with the bot) has
  its own independent history. Use `/new` to clear the history and start over.
- The `.env` file and the `data/` directory are not committed (see `.gitignore`).
