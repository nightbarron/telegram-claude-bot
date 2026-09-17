# Telegram Claude Bot

A Telegram bot that lets you chat with Claude (Sonnet model), with a `/new` command to start a
fresh conversation, per-chat history management, and access-code authentication before chatting
is allowed.

## Features

- Chat directly with Claude through Telegram messages.
- `/new`: clears the current history and starts a new session.
- `/help`: view usage instructions.
- Each chat (user) has its own session, stored as a JSON file in `data/sessions/`, keeping the
  last `MAX_HISTORY_MESSAGES` messages to send as context to Claude.
- Access-code authentication (`ACCESS_CODE`): a new user must send this code before the bot will
  chat with them. Once verified, the user is permanently saved to a dynamic whitelist
  (`data/authorized_users.json`) and never needs to enter it again. The number of users allowed to
  authenticate is limited by `MAX_AUTHORIZED_USERS` (default 2) — once that limit is reached, a
  new user entering the correct code is still rejected.

## Setup

```bash
npm install
cp .env.example .env
```

Edit the `.env` file:

- `TELEGRAM_BOT_TOKEN`: create a bot and get the token from [@BotFather](https://t.me/BotFather).
- `ANTHROPIC_API_KEY`: get it from https://console.anthropic.com.
- `ACCESS_CODE`: the code users must enter correctly (e.g. `119149`) before they can chat.
- `MAX_AUTHORIZED_USERS`: maximum number of users allowed to authenticate (default `2`).
- The remaining variables (`CLAUDE_MODEL`, `CLAUDE_MAX_TOKENS`, `SYSTEM_PROMPT`,
  `MAX_HISTORY_MESSAGES`, `DATA_DIR`) have sensible defaults; change them if needed.

To revoke an already-authorized user, edit/remove the corresponding line in
`data/authorized_users.json` (or delete the whole file to reset the whitelist), then restart the
bot.

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
cp .env.example .env   # fill in the token/API key/whitelist first
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

Or with plain Docker (no compose):

```bash
docker build -t telegram-claude-bot .
docker run -d --name telegram-claude-bot \
  --env-file .env \
  -v "$(pwd)/data:/app/data" \
  --restart unless-stopped \
  telegram-claude-bot
```

## CI/CD

On every push to `main` (or a `v*` tag), a GitHub Actions workflow
([.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml)) builds a
multi-arch (amd64/arm64) image and pushes it to Docker Hub as
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
  accessControl.ts # access-code authentication, dynamic whitelist (data/authorized_users.json)
  claude.ts        # calls the Anthropic API (Claude Sonnet)
  bot.ts           # Telegraf command and handler definitions
  index.ts         # entrypoint, starts the bot
```

## Notes

- Sessions are stored per `chatId`, so each chat (e.g. each user chatting 1-1 with the bot) has
  its own independent history. Use `/new` to clear the history and start over.
- The `.env` file and the `data/` directory are not committed (see `.gitignore`).
