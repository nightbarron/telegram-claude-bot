import { Context, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import OpenAI from 'openai';
import { config } from './config';
import { isAuthorized } from './accessControl';
import { getSession, resetSession, appendMessage } from './sessionStore';
import { appendLog } from './chatLog';
import { searchMemory } from './memory';
import { askClaude } from './claude';
import { toTelegramMarkdown } from './format';
import { extractTextFromDocument } from './attachments';
import { transcribeAudio } from './transcribe';

async function downloadFile(ctx: Context, fileId: string): Promise<Buffer> {
  const link = await ctx.telegram.getFileLink(fileId);
  const res = await fetch(link.href);
  if (!res.ok) throw new Error(`Tai file that bai (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function handleTurn(
  ctx: Context,
  chatId: number,
  userId: number,
  content: string | OpenAI.Chat.ChatCompletionContentPart[],
  loggedText: string
): Promise<void> {
  const session = getSession(userId, chatId);
  const memoryQuery = typeof content === 'string' ? content : loggedText;
  const memories = searchMemory(chatId, memoryQuery).filter(
    (m) => !session.messages.some((h) => h.timestamp === m.timestamp)
  );

  const { text: reply, images } = await askClaude(session.messages, content, memories);

  const userMsg = { role: 'user' as const, content: loggedText, timestamp: Date.now() };
  const assistantMsg = { role: 'assistant' as const, content: reply, timestamp: Date.now() };
  appendMessage(chatId, userMsg);
  appendMessage(chatId, assistantMsg);
  appendLog(chatId, userMsg);
  appendLog(chatId, assistantMsg);

  for (const image of images) {
    await ctx.replyWithPhoto({ source: image });
  }

  if (reply) {
    try {
      await ctx.reply(toTelegramMarkdown(reply), { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(reply);
    }
  }
}

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
        'Gui tin nhan, hinh anh, file (PDF/Word/Excel/PowerPoint/txt) hoac tin nhan thoai de tro chuyen.\n' +
        'Dung /new de bat dau phien tro chuyen moi, /help de xem tro giup.'
    );
  });

  bot.help(async (ctx) => {
    await ctx.reply(
      'Cac lenh:\n' +
        '/new - Bat dau phien tro chuyen moi (xoa lich su cu)\n' +
        '/help - Hien tro giup nay\n\n' +
        'Ban co the:\n' +
        '- Nhan tin binh thuong de tro chuyen.\n' +
        '- Gui hinh anh de nho phan tich/mo ta.\n' +
        '- Gui file PDF/Word/Excel/PowerPoint/txt/md/csv de doc va tom tat.\n' +
        '- Gui tin nhan thoai (voice) de chuyen thanh van ban va tra loi.'
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

    await ctx.sendChatAction('typing');
    try {
      await handleTurn(ctx, chatId, userId, text, text);
    } catch (err) {
      console.error('Loi khi goi Claude API:', err);
      await ctx.reply('Da xay ra loi khi goi Claude. Vui long thu lai sau.');
    }
  });

  bot.on(message('photo'), async (ctx) => {
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const caption = ctx.message.caption?.trim();

    await ctx.sendChatAction('typing');
    try {
      const photos = ctx.message.photo;
      const largest = photos[photos.length - 1];
      const buffer = await downloadFile(ctx, largest.file_id);
      const base64 = buffer.toString('base64');

      const content: OpenAI.Chat.ChatCompletionContentPart[] = [
        { type: 'text', text: caption || 'Hay mo ta va phan tich hinh anh nay giup toi.' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
      ];
      const loggedText = `[Da gui 1 hinh anh]${caption ? `: ${caption}` : ''}`;

      await handleTurn(ctx, chatId, userId, content, loggedText);
    } catch (err) {
      console.error('Loi khi xu ly hinh anh:', err);
      await ctx.reply('Da xay ra loi khi xu ly hinh anh. Vui long thu lai sau.');
    }
  });

  bot.on(message('document'), async (ctx) => {
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const doc = ctx.message.document;
    const caption = ctx.message.caption?.trim();
    const filename = doc.file_name ?? 'file';

    await ctx.sendChatAction('typing');
    try {
      const buffer = await downloadFile(ctx, doc.file_id);
      const extractedText = await extractTextFromDocument(buffer, doc.mime_type, filename);

      const userText =
        `Noi dung file "${filename}":\n"""\n${extractedText}\n"""\n\n` +
        (caption || 'Hay doc va tom tat/tra loi giup toi dua tren noi dung file nay.');

      await handleTurn(ctx, chatId, userId, userText, userText);
    } catch (err) {
      console.error('Loi khi xu ly file:', err);
      await ctx.reply(`Khong xu ly duoc file nay: ${(err as Error).message}`);
    }
  });

  bot.on(message('voice'), async (ctx) => {
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;

    await ctx.sendChatAction('typing');
    try {
      const buffer = await downloadFile(ctx, ctx.message.voice.file_id);
      const transcript = await transcribeAudio(buffer, 'voice.ogg');

      if (!transcript.trim()) {
        await ctx.reply('Sen khong nghe ro noi dung tin nhan thoai nay, Co Chu thu gui lai giup Sen nhe.');
        return;
      }

      const userText = `(Tin nhan thoai da chuyen thanh van ban): ${transcript}`;
      await handleTurn(ctx, chatId, userId, userText, userText);
    } catch (err) {
      console.error('Loi khi xu ly tin nhan thoai:', err);
      await ctx.reply('Da xay ra loi khi xu ly tin nhan thoai. Vui long thu lai sau.');
    }
  });

  return bot;
}
