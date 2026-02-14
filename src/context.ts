import { isMainThread } from 'node:worker_threads';
import { CONSOLE } from './logger/console.js';
import { Logger } from './logger/index.js';
import { PARENT_PORT } from './logger/parent-port.js';
import { NetworkDiscordClient, NOOP_DISCORD_CLIENT } from './utils/DiscordUtils.js';
import { DiscordLogHandler } from './logger/discord.js';
import { ASYNC_DISPOSE } from './utils/dispose.js';

export class ServerContext {
  public discord = NOOP_DISCORD_CLIENT;

  public logger = new Logger([CONSOLE]);

  public async init() {
    const fallbackLogger = new Logger([isMainThread ? CONSOLE : PARENT_PORT]);

    const webhhookUrl = process.env.WEBHOOK_LOGS;
    const [webhookId, webhookToken] = webhhookUrl ? webhhookUrl.split('/').slice(-2) : [undefined, undefined];

    const discord = new NetworkDiscordClient({
      webhookId,
      webhookToken,
      logger: fallbackLogger,
    });

    let logger: Logger;
    if (isMainThread) {
      const discordLogHandler = new DiscordLogHandler(discord, (e: Error) => {
        fallbackLogger.error(e);
      });
      logger = new Logger([CONSOLE, discordLogHandler]);
    } else {
      logger = fallbackLogger;
    }

    await this.logger.close();

    this.discord = discord;
    this.logger = logger;

    return this;
  }

  public async close() {
    const logger = this.logger.close();
    await Promise.allSettled([logger]);
  }

  public async [ASYNC_DISPOSE]() {
    await this.close();
  }
}

export const GLOBAL = await new ServerContext().init();
export const LOGGER = {
  log: (message: unknown) => GLOBAL.logger.log(message),
  debug: (message: unknown) => GLOBAL.logger.debug(message),
  info: (message: unknown) => GLOBAL.logger.info(message),
  warn: (message: unknown) => GLOBAL.logger.warn(message),
  error: (message: unknown) => GLOBAL.logger.error(message),
};
export const DISCORD = () => GLOBAL.discord;
