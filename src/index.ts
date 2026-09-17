import { createBot } from './bot';
import { cleanupOldLogs } from './chatLog';
import { scheduleDailyReset } from './dailyReset';
import { scheduleMorningGreeting } from './morningGreeting';

cleanupOldLogs();
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);
scheduleDailyReset();

const bot = createBot();
scheduleMorningGreeting(bot);

bot
  .launch()
  .then(() => console.log('Bot da khoi dong.'))
  .catch((err) => {
    console.error('Khong the khoi dong bot:', err);
    process.exit(1);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
