import { config } from './config';

export function isAuthorized(userId: number | undefined): boolean {
  if (!userId) return false;
  return config.allowedUserIds.includes(userId);
}
