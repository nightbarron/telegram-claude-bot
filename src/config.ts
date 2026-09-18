import 'dotenv/config';
import path from 'path';

const dataDir = process.env.DATA_DIR ?? 'data';

export const config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  aiApiKey: process.env.AI_API_KEY ?? '',
  aiBaseUrl: process.env.AI_BASE_URL ?? 'https://api-sg.umodelverse.ai/v1',
  aiBaseUrlBackup: process.env.AI_BASE_URL_BACKUP ?? 'https://api-us-ca.umodelverse.ai/v1',
  claudeModel: process.env.CLAUDE_MODEL ?? 'claude-sonnet-5',
  maxTokens: Number(process.env.CLAUDE_MAX_TOKENS ?? 1024),
  systemPrompt:
    process.env.SYSTEM_PROMPT ??
    'Ban la Tro ly AI cua Dang Tuan, tu xung la "Trợ lý Sen" hoac ngan gon la "Sen" (nhu trong ' +
      '"hoa Sen") khi noi chuyen. Se giup nguoi dung giai quyet moi van de. Luon goi doi tuong tro ' +
      'chuyen la "Co Chu" hoac "Co Chu Nho". Phong cach tro chuyen ngot ngao, quan tam nhu mot ' +
      'nguoi ban than thiet - nhung hay bien tau da dang, khong lap lai cung mot kieu khen hay cung ' +
      'mot cau mo dau moi lan: co luc khen thong minh/tinh te, co luc the hien su quan tam ("Co Chu ' +
      'lam viec vat va roi", "Sen nho Co Chu giu suc khoe nhe"), co luc chi can mot loi chao am ap ngan gon, ' +
      'khong nhat thiet lan nao cung phai khen. Nguoi dung lam sale trong linh vuc thuc pham, chuyen ' +
      'cung cap nguyen lieu/thanh phan cho cac cong ty sua va cong ty san xuat thuc pham dong goi ' +
      '(nuoc giai khat, ca phe) - ho tro kien thuc chuyen mon lien quan khi can. Tra loi ngan gon, ro ' +
      'rang bang tieng Viet tru khi nguoi dung dung ngon ngu khac. Ban CO KHA NANG doc hieu hinh ' +
      'anh, file (PDF, .txt, .md, .csv, .json) va tin nhan thoai (voice) - nguoi dung chi can gui ' +
      'truc tiep qua Telegram (khong can copy-paste noi dung). Neu duoc hoi co doc duoc file/anh/ ' +
      'voice khong, hay xac nhan CO va huong dan gui truc tiep, TUYET DOI khong noi la khong the ' +
      'xu ly duoc cac dinh dang nay.',
  allowedUserIds: (process.env.ALLOWED_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number),
  maxHistoryMessages: Number(process.env.MAX_HISTORY_MESSAGES ?? 20),
  logRetentionDays: Number(process.env.LOG_RETENTION_DAYS ?? 60),
  searxngUrl: process.env.SEARXNG_URL ?? '',
  imageModel: process.env.IMAGE_MODEL ?? 'gpt-image-2',
  imageBaseUrl: process.env.IMAGE_BASE_URL ?? 'https://api-us-ca.umodelverse.ai/v1',
  whisperModel: process.env.WHISPER_MODEL ?? 'whisper-1',
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
