import fs from 'fs';
import path from 'path';
import { config } from './config';

interface AuthorizedUser {
  userId: number;
  username?: string;
  firstName?: string;
  authorizedAt: number;
}

let authorizedUsers = new Map<number, AuthorizedUser>();

function ensureDir(): void {
  fs.mkdirSync(path.dirname(config.authFilePath), { recursive: true });
}

function load(): void {
  try {
    const raw = fs.readFileSync(config.authFilePath, 'utf-8');
    const list = JSON.parse(raw) as AuthorizedUser[];
    authorizedUsers = new Map(list.map((u) => [u.userId, u]));
  } catch {
    authorizedUsers = new Map();
  }
}

function persist(): void {
  ensureDir();
  const tmp = `${config.authFilePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify([...authorizedUsers.values()], null, 2));
  fs.renameSync(tmp, config.authFilePath);
}

load();

export function isAuthorized(userId: number | undefined): boolean {
  if (!userId) return false;
  return authorizedUsers.has(userId);
}

export function hasReachedUserLimit(): boolean {
  return authorizedUsers.size >= config.maxAuthorizedUsers;
}

export function authorizeUser(
  userId: number,
  info?: { username?: string; first_name?: string }
): void {
  authorizedUsers.set(userId, {
    userId,
    username: info?.username,
    firstName: info?.first_name,
    authorizedAt: Date.now(),
  });
  persist();
}

export function checkAccessCode(code: string): boolean {
  return code === config.accessCode;
}
