import { EmbedBuilder, WebhookClient } from 'discord.js';
import type { Response } from 'express';
import { Logger } from '../logger/index.js';

const DEFAULT_TIMEOUT = 5000;
// Maximum accepted length for the embed title
const MAX_EMBED_TITLE_LENGTH = 256;
// Maximum accepted length for the main message content
export const MAX_CONTENT_LENGTH = 2000;
// Ellipsis character, used to indicate truncated content
const ELLIPSIS = '…';
const SEND_MESSAGE_PREFIX = '```\n';
const SEND_MESSAGE_SUFFIX = '\n```';
const SEND_MESSAGE_SUFFIX_TRUNCATED = `\n${ELLIPSIS}\n\`\`\``;
// Maximum length of a `sendMessage` input to avoid truncation
export const SEND_MESSAGE_SAFE_LENGTH = MAX_CONTENT_LENGTH - SEND_MESSAGE_PREFIX.length - SEND_MESSAGE_SUFFIX.length;

/**
 * Format the provided string as an embed title.
 *
 * If the string is too long, it will be truncated to fit.
 */
const formatEmbedTitle = (title: string) => {
  if (title.length <= MAX_EMBED_TITLE_LENGTH) {
    return title;
  }
  const shortTitle = title.substring(0, MAX_EMBED_TITLE_LENGTH - ELLIPSIS.length);
  return shortTitle + ELLIPSIS;
};

export type DiscordClient = {
  sendError(error: Error, res?: Response): void;
  sendMessage(message: string): Promise<void>;
};

export const NOOP_DISCORD_CLIENT: DiscordClient = {
  sendError(error) {
    console.error(error);
  },
  sendMessage(message) {
    console.log(message);
    return Promise.resolve();
  },
};

export type NetworkDiscordClientOptions = {
  webhookId?: string;
  webhookToken?: string;
  timeout?: number;
  logger: Logger;
};

export class NetworkDiscordClient implements DiscordClient {
  readonly #logger: Logger;

  /**
   * Client used to send logs
   */
  readonly #logClient?: WebhookClient;

  /**
   * Create a new Discord client
   *
   * If the config is `null`, methods will be no-ops.
   */
  public constructor(options: NetworkDiscordClientOptions) {
    const clientOptions = {
      rest: {
        timeout: options.timeout ?? DEFAULT_TIMEOUT,
      },
    };

    if (options.webhookId && options.webhookToken) {
      this.#logClient = new WebhookClient(
        {
          id: options.webhookId,
          token: options.webhookToken,
        },
        clientOptions
      );
    }

    this.#logger = options.logger;
  }

  public sendError(error: Error, res?: Response) {
    if (!this.#logClient) {
      console.error(error);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(formatEmbedTitle(res ? res.req.originalUrl : error.message))
      .setAuthor({
        name: 'ZenHordes',
        iconURL: 'https://zenoo.github.io/zen-hordes/icons/zen-icon.png',
      })
      .setDescription(
        `\`\`\`
${error.stack}
\`\`\``
      )
      .setTimestamp();

    if (res) {
      embed.addFields(
        // Request method
        { name: 'Method', value: res.req.method, inline: true },
        // Response status code
        { name: 'Status code', value: (res.statusCode || 0).toString(), inline: true },
        // Response status message
        { name: 'Status', value: res.statusMessage || '', inline: true }
      );

      // Request params
      if (Object.keys(res.req.params).length) {
        embed.addFields({
          name: 'Params',
          value: `\`\`\`json
  ${JSON.stringify(res.req.params)}
  \`\`\``.substring(0, 1024),
        });
      }

      // Request body
      if (Object.keys((res.req.body as object | undefined) ?? {}).length) {
        embed.addFields({
          name: 'Body',
          value: `\`\`\`json
  ${JSON.stringify(res.req.body)}
  \`\`\``.substring(0, 1024),
        });
      }
    }

    this.#logClient.send({ embeds: [embed] }).catch((err) => {
      this.#logger.error(`Error trying to send a message: ${err}`);
    });
  }

  public async sendMessage(message: string) {
    if (!this.#logClient) {
      return;
    }

    let content = SEND_MESSAGE_PREFIX + message + SEND_MESSAGE_SUFFIX;
    if (content.length > MAX_CONTENT_LENGTH) {
      const shortLen = MAX_CONTENT_LENGTH - SEND_MESSAGE_PREFIX.length - SEND_MESSAGE_SUFFIX_TRUNCATED.length;
      const short = message.substring(0, shortLen);
      content = SEND_MESSAGE_PREFIX + short + SEND_MESSAGE_SUFFIX_TRUNCATED;
    }
    await this.#logClient.send({ content });
  }
}
