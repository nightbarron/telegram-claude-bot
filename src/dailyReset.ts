import { resetAllSessions } from './sessionStore';

// Viet Nam la UTC+7, khong co gio mua he (DST), nen 3h sang VN = 20h UTC hom truoc.
const RESET_HOUR_UTC = 20;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function msUntilNextReset(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RESET_HOUR_UTC, 0, 0, 0)
  );
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export function scheduleDailyReset(): void {
  const run = (): void => {
    resetAllSessions();
    console.log('Da tu dong reset toan bo session (3h sang, gio Viet Nam).');
    setTimeout(run, ONE_DAY_MS);
  };
  setTimeout(run, msUntilNextReset());
}
