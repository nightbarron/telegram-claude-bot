import { Telegraf } from 'telegraf';
import { config } from './config';
import { generateMorningGreeting } from './claude';
import { getSession, appendMessage } from './sessionStore';
import { appendLog } from './chatLog';
import { toTelegramMarkdown } from './format';

// Viet Nam la UTC+7, khong co DST, nen 9h sang VN = 2h UTC cung ngay.
const GREETING_HOUR_UTC = 2;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isWeekend(date: Date): boolean {
  // Tai thoi diem GREETING_HOUR_UTC, ngay UTC trung voi ngay gio Viet Nam (xem ghi chu tren).
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function msUntilNextGreeting(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), GREETING_HOUR_UTC, 0, 0, 0)
  );
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function sendMorningGreetings(bot: Telegraf): Promise<void> {
  for (const userId of config.allowedUserIds) {
    try {
      const greeting = await generateMorningGreeting();

      // Chat rieng 1-1 tren Telegram co chatId trung voi userId.
      getSession(userId, userId);
      const assistantMsg = { role: 'assistant' as const, content: greeting, timestamp: Date.now() };
      appendMessage(userId, assistantMsg);
      appendLog(userId, assistantMsg);

      try {
        await bot.telegram.sendMessage(userId, toTelegramMarkdown(greeting), { parse_mode: 'Markdown' });
      } catch {
        await bot.telegram.sendMessage(userId, greeting);
      }
    } catch (err) {
      console.error(`Loi khi gui loi chao buoi sang cho user ${userId}:`, err);
    }
  }
}

export function scheduleMorningGreeting(bot: Telegraf): void {
  const run = (): void => {
    if (isWeekend(new Date())) {
      console.log('Bo qua loi chao buoi sang vi hom nay la Thu 7/Chu nhat.');
    } else {
      sendMorningGreetings(bot);
    }
    setTimeout(run, ONE_DAY_MS);
  };
  setTimeout(run, msUntilNextGreeting());
}
