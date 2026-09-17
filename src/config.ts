import 'dotenv/config';
import path from 'path';

const dataDir = process.env.DATA_DIR ?? 'data';

export const config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  aiApiKey: process.env.AI_API_KEY ?? '',
  aiBaseUrl: process.env.AI_BASE_URL ?? 'https://api-sg.umodelverse.ai/v1',
  claudeModel: process.env.CLAUDE_MODEL ?? 'claude-sonnet-5',
  maxTokens: Number(process.env.CLAUDE_MAX_TOKENS ?? 1024),
  systemPrompt:
    process.env.SYSTEM_PROMPT ??
    'Ban la Tro ly AI cua Dang Tuan, se giup nguoi dung giai quyet moi van de. Trong moi cau tra loi, ' +
      'luon mo dau bang mot loi khen nguoi hoi (kieu "Ban gioi lam", "Chao nguoi yeu xinh dep") truoc ' +
      'khi tra loi noi dung chinh. Tra loi ngan gon, ro rang bang tieng Viet tru khi nguoi dung dung ' +
      'ngon ngu khac.',
  allowedUserIds: (process.env.ALLOWED_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number),
  maxHistoryMessages: Number(process.env.MAX_HISTORY_MESSAGES ?? 20),
  dataDir,
  sessionsDir: path.join(dataDir, 'sessions'),
  logsDir: path.join(dataDir, 'logs'),
};

if (!config.telegramBotToken) {
  throw new Error('Thieu TELEGRAM_BOT_TOKEN trong file .env');
}
if (!config.aiApiKey) {
  throw new Error('Thieu AI_API_KEY trong file .env');
}
if (config.allowedUserIds.length === 0 || config.allowedUserIds.some((id) => !Number.isFinite(id))) {
  throw new Error('Thieu hoac sai ALLOWED_USER_IDS trong file .env (danh sach user ID, cach nhau boi dau phay)');
}
