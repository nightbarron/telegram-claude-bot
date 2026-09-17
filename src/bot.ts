import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { config } from './config';
import { isAuthorized } from './accessControl';
import { getSession, resetSession, appendMessage } from './sessionStore';
import { appendLog } from './chatLog';
import { askClaude } from './claude';

export function createBot(): Telegraf {
  const bot = new Telegraf(config.telegramBotToken);

  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!isAuthorized(userId)) {
      await ctx.reply('Ban khong co quyen su dung bot nay.');
      return;
    }
    return next();
  });

  bot.start(async (ctx) => {
    resetSession(ctx.from.id, ctx.chat.id);
    await ctx.reply(
      'Xin chao! Toi la tro ly Claude.\n' +
        'Gui tin nhan de bat dau tro chuyen.\n' +
        'Dung /new de bat dau phien tro chuyen moi, /help de xem tro giup.'
    );
  });

  bot.help(async (ctx) => {
    await ctx.reply(
      'Cac lenh:\n' +
        '/new - Bat dau phien tro chuyen moi (xoa lich su cu)\n' +
        '/help - Hien tro giup nay\n\n' +
        'Chi can nhan tin binh thuong de tro chuyen voi Claude.'
    );
  });

  bot.command('new', async (ctx) => {
    resetSession(ctx.from.id, ctx.chat.id);
    await ctx.reply('Da bat dau phien tro chuyen moi. Lich su truoc do da duoc xoa.');
  });

  bot.on(message('text'), async (ctx) => {
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const text = ctx.message.text;

    const session = getSession(userId, chatId);

    await ctx.sendChatAction('typing');

    try {
      const reply = await askClaude(session.messages, text);
      const userMsg = { role: 'user' as const, content: text, timestamp: Date.now() };
      const assistantMsg = { role: 'assistant' as const, content: reply, timestamp: Date.now() };
      appendMessage(chatId, userMsg);
      appendMessage(chatId, assistantMsg);
      appendLog(chatId, userMsg);
      appendLog(chatId, assistantMsg);
      await ctx.reply(reply);
    } catch (err) {
      console.error('Loi khi goi Claude API:', err);
      await ctx.reply('Da xay ra loi khi goi Claude. Vui long thu lai sau.');
    }
  });

  return bot;
}
