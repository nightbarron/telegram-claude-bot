import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from './config';
import { ChatMessage, Session } from './types';

const cache = new Map<number, Session>();

function ensureDir(): void {
  fs.mkdirSync(config.sessionsDir, { recursive: true });
}

function filePath(chatId: number): string {
  return path.join(config.sessionsDir, `${chatId}.json`);
}

function loadFromDisk(chatId: number): Session | undefined {
  try {
    const raw = fs.readFileSync(filePath(chatId), 'utf-8');
    return JSON.parse(raw) as Session;
  } catch {
    return undefined;
  }
}

function persist(session: Session): void {
  ensureDir();
  const target = filePath(session.chatId);
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(session, null, 2));
  fs.renameSync(tmp, target);
}

function createSession(userId: number, chatId: number): Session {
  const session: Session = {
    sessionId: crypto.randomUUID(),
    userId,
    chatId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
  cache.set(chatId, session);
  persist(session);
  return session;
}

export function getSession(userId: number, chatId: number): Session {
  const cached = cache.get(chatId);
  if (cached) return cached;

  const fromDisk = loadFromDisk(chatId);
  if (fromDisk) {
    cache.set(chatId, fromDisk);
    return fromDisk;
  }

  return createSession(userId, chatId);
}

export function resetSession(userId: number, chatId: number): Session {
  return createSession(userId, chatId);
}

export function resetAllSessions(): void {
  let files: string[];
  try {
    files = fs.readdirSync(config.sessionsDir);
  } catch {
    return;
  }

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = fs.readFileSync(path.join(config.sessionsDir, file), 'utf-8');
      const session = JSON.parse(raw) as Session;
      resetSession(session.userId, session.chatId);
    } catch {
      // bo qua file session hong
    }
  }
}

export function appendMessage(chatId: number, message: ChatMessage): void {
  const session = cache.get(chatId);
  if (!session) return;

  session.messages.push(message);
  if (session.messages.length > config.maxHistoryMessages) {
    session.messages.splice(0, session.messages.length - config.maxHistoryMessages);
  }
  session.updatedAt = Date.now();
  persist(session);
}
