import fs from 'fs';
import path from 'path';
import { config } from './config';
import { ChatMessage } from './types';

function logFilePath(chatId: number, timestamp: number): string {
  const dir = path.join(config.logsDir, String(chatId));
  fs.mkdirSync(dir, { recursive: true });
  const day = new Date(timestamp).toISOString().slice(0, 10);
  return path.join(dir, `${day}.jsonl`);
}

export function appendLog(chatId: number, message: ChatMessage): void {
  const line = JSON.stringify(message) + '\n';
  fs.appendFileSync(logFilePath(chatId, message.timestamp), line);
}

export function cleanupOldLogs(): void {
  const cutoff = Date.now() - config.logRetentionDays * 24 * 60 * 60 * 1000;
  let chatDirs: string[];
  try {
    chatDirs = fs.readdirSync(config.logsDir);
  } catch {
    return;
  }

  for (const chatDir of chatDirs) {
    const dir = path.join(config.logsDir, chatDir);
    for (const file of fs.readdirSync(dir)) {
      const match = /^(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(file);
      if (!match) continue;
      if (new Date(match[1]).getTime() < cutoff) {
        fs.unlinkSync(path.join(dir, file));
        console.log(`Da xoa log qua han: ${path.join(dir, file)}`);
      }
    }
  }
}
