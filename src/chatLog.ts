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
