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
- "Second brain" recall: before answering, the bot does a simple keyword search over that chat's
  full archive and feeds any relevant older messages back to Claude as extra context, so it can
  reference things said well before the current session window.
- Log files older than `LOG_RETENTION_DAYS` (default 60) are deleted automatically, checked at
  startup and every 24h.
- Optional web search: set `SEARXNG_URL` to a self-hosted [SearXNG](https://docs.searxng.org/)
  instance and Claude can call it as a tool for up-to-date/real-world information. Leave it empty
  to disable.
- Every session is automatically reset (like `/new`) at 3:00 AM Vietnam time (UTC+7) daily.
- Proactive morning greeting: at 9:00 AM Vietnam time daily, the bot has Claude write a fresh,
  varied "good morning" message and sends it to every ID in `ALLOWED_USER_IDS`.
- Resilient API calls: each request retries a couple of times on the primary endpoint, then fails
  over to `AI_BASE_URL_BACKUP` (default: ModelVerse's other region) if the primary keeps failing.
- Image generation: Claude can call a `generate_image` tool (model configurable via `IMAGE_MODEL`,
  default `gpt-image-2`) when asked to draw/create a picture, and the bot sends the result as a
  Telegram photo.
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
- `AI_BASE_URL_BACKUP`: fallback base URL used if `AI_BASE_URL` keeps failing (default:
  ModelVerse's other region).
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
  memory.ts        # keyword search over the full archive to recall older context
  search.ts        # queries a self-hosted SearXNG instance for web search results
  image.ts         # calls the image generation API and returns a PNG buffer
  format.ts        # converts model markdown output to Telegram-compatible markdown
  dailyReset.ts    # resets every session at 3:00 AM Vietnam time daily
  morningGreeting.ts # sends a Claude-written good morning message at 9:00 AM Vietnam time
  accessControl.ts # checks a user's Telegram ID against ALLOWED_USER_IDS
  claude.ts        # calls the configured OpenAI-compatible API (Claude model)
  bot.ts           # Telegraf command and handler definitions
  index.ts         # entrypoint, starts the bot
```

## Notes

- Sessions are stored per `chatId`, so each chat (e.g. each user chatting 1-1 with the bot) has
  its own independent history. Use `/new` to clear the history and start over.
- The `.env` file and the `data/` directory are not committed (see `.gitignore`).
