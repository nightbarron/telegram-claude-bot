# Telegram Claude Bot

Bot Telegram cho phep chat voi Claude (model Sonnet), co lenh `/new` de tao phien tro chuyen moi,
tu quan ly lich su hoi thoai theo tung chat, va xac thuc bang ma truoc khi cho phep chat.

## Tinh nang

- Chat truc tiep voi Claude qua tin nhan Telegram.
- `/new`: xoa lich su hien tai, bat dau mot phien (session) moi.
- `/help`: xem huong dan.
- Moi chat (user) co session rieng, luu vao file JSON trong `data/sessions/`, giu lai toi da
  `MAX_HISTORY_MESSAGES` tin nhan gan nhat de gui kem lam ngu canh cho Claude.
- Xac thuc bang ma (`ACCESS_CODE`): user moi phai nhan tin dung ma nay cho bot moi duoc chat.
  Sau khi nhap dung, user duoc luu vinh vien vao whitelist dong (`data/authorized_users.json`)
  va khong can nhap lai. So luong user duoc phep xac thuc bi gioi han boi `MAX_AUTHORIZED_USERS`
  (mac dinh 2) — khi da du so luong, nguoi moi nhap dung ma van bi tu choi.

## Cai dat

```bash
npm install
cp .env.example .env
```

Sua file `.env`:

- `TELEGRAM_BOT_TOKEN`: tao bot va lay token tu [@BotFather](https://t.me/BotFather).
- `ANTHROPIC_API_KEY`: lay tu https://console.anthropic.com.
- `ACCESS_CODE`: ma xac thuc nguoi dung phai nhap dung (vi du `119149`) truoc khi duoc chat.
- `MAX_AUTHORIZED_USERS`: so nguoi toi da duoc phep xac thuc (mac dinh `2`).
- Cac bien con lai (`CLAUDE_MODEL`, `CLAUDE_MAX_TOKENS`, `SYSTEM_PROMPT`, `MAX_HISTORY_MESSAGES`,
  `DATA_DIR`) co gia tri mac dinh hop ly, chinh neu can.

Neu muon go quyen mot user da xac thuc, sua/xoa dong tuong ung trong
`data/authorized_users.json` (hoac xoa ca file de reset toan bo whitelist) roi khoi dong lai bot.

## Chay

Che do phat trien (tu restart khi sua code):

```bash
npm run dev
```

Build va chay production:

```bash
npm run build
npm start
```

## Chay bang Docker

Build va chay voi Docker Compose (khuyen nghi):

```bash
cp .env.example .env   # dien token/API key/whitelist truoc
docker compose up -d --build
```

Xem log:

```bash
docker compose logs -f
```

Dung bot:

```bash
docker compose down
```

Session duoc luu ben ngoai container qua volume `./data`, khong mat khi restart/rebuild container.

Hoac dung Docker thuan (khong compose):

```bash
docker build -t telegram-claude-bot .
docker run -d --name telegram-claude-bot \
  --env-file .env \
  -v "$(pwd)/data:/app/data" \
  --restart unless-stopped \
  telegram-claude-bot
```

## Cau truc

```
src/
  config.ts        # doc va validate bien moi truong
  types.ts         # dinh nghia Session, ChatMessage
  sessionStore.ts  # tao/doc/ghi/reset session, luu xuong data/sessions/<chatId>.json
  accessControl.ts # xac thuc bang ma, quan ly whitelist dong (data/authorized_users.json)
  claude.ts        # goi Anthropic API (Claude Sonnet)
  bot.ts           # dinh nghia cac lenh va handler Telegraf
  index.ts         # entrypoint, khoi dong bot
```

## Luu y

- Session duoc luu theo `chatId`, moi chat rieng (vi du moi user chat 1-1 voi bot) co lich su
  doc lap. Dung `/new` de xoa lich su va bat dau lai tu dau.
- File `.env` va thu muc `data/` khong duoc commit (xem `.gitignore`).
