import fs from 'fs';
import path from 'path';
import { config } from './config';
import { ChatMessage } from './types';

function listLogFiles(chatId: number): string[] {
  const dir = path.join(config.logsDir, String(chatId));
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

function readAllMessages(chatId: number): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const file of listLogFiles(chatId)) {
    const lines = fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        messages.push(JSON.parse(line) as ChatMessage);
      } catch {
        // bo qua dong log hong
      }
    }
  }
  return messages;
}

function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length >= 3)
    )
  );
}

export function searchMemory(chatId: number, query: string, limit = 5): ChatMessage[] {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return [];

  const scored = readAllMessages(chatId)
    .map((message) => {
      const contentLower = message.content.toLowerCase();
      const score = keywords.reduce((acc, kw) => acc + (contentLower.includes(kw) ? 1 : 0), 0);
      return { message, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.message.timestamp - a.message.timestamp);

  return scored.slice(0, limit).map((x) => x.message);
}
