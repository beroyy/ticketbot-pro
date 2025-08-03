import { fetch, FetchResultTypes, FetchMethods } from "@sapphire/fetch";
import { createHmac } from "crypto";
import { container } from "@sapphire/framework";

/**
 * Webhook client for sending events to the web application
 */

export interface WebhookPayload<T = unknown> {
  event: string;
  timestamp: string;
  data: T;
}

export interface GuildJoinedData {
  guildId: string;
  guildName: string;
  ownerId: string;
  memberCount: number;
}

export interface GuildLeftData {
  guildId: string;
}

export interface SetupCompleteData {
  guildId: string;
  supportCategoryId?: string;
  transcriptsChannelId?: string;
  logChannelId?: string;
  defaultRoleId?: string;
}

export class WebhookClient {
  private readonly baseUrl: string;
  private readonly secret: string;
  private readonly logger = container.logger;

  constructor() {
    const webUrl = process.env.WEB_URL;
    const webhookSecret = process.env.BOT_WEBHOOK_SECRET;

    if (!webUrl) {
      throw new Error("WEB_URL environment variable is not set");
    }

    if (!webhookSecret) {
      throw new Error("BOT_WEBHOOK_SECRET environment variable is not set");
    }

    this.baseUrl = webUrl.replace(/\/$/, ""); // Remove trailing slash
    this.secret = webhookSecret;
  }

  /**
   * Creates webhook signature for authentication
   */
  private createSignature(payload: string, timestamp: string): string {
    const signaturePayload = `${timestamp}.${payload}`;
    const signature = createHmac("sha256", this.secret)
      .update(signaturePayload)
      .digest("hex");
    return `sha256=${signature}`;
  }

  /**
   * Sends a webhook to the web application
   */
  private async sendWebhook<T = unknown>(
    endpoint: string,
    payload: WebhookPayload<T>
  ): Promise<void> {
    const url = `${this.baseUrl}/api/webhooks/bot/${endpoint}`;
    const timestamp = Date.now().toString();
    const body = JSON.stringify(payload);
    const signature = this.createSignature(body, timestamp);

    try {
      this.logger.debug(`Sending webhook to ${endpoint}`, {
        event: payload.event,
        data: payload.data,
      });

      const response = await fetch(
        url,
        {
          method: FetchMethods.Post,
          headers: {
            "Content-Type": "application/json",
            "x-webhook-signature": signature,
            "x-webhook-timestamp": timestamp,
          },
          body,
        },
        FetchResultTypes.JSON
      );

      this.logger.info(`✅ Webhook sent successfully to ${endpoint}`, {
        event: payload.event,
        response,
      });
    } catch (error) {
      this.logger.error(`❌ Failed to send webhook to ${endpoint}`, {
        event: payload.event,
        error: error instanceof Error ? error.message : String(error),
        url,
      });

      // Don't throw - webhook failures shouldn't break bot operations
      // The bot should continue working even if webhooks fail
    }
  }

  /**
   * Notifies web app that bot joined a guild
   */
  public async sendGuildJoined(data: GuildJoinedData): Promise<void> {
    await this.sendWebhook("guild-joined", {
      event: "guild.joined",
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /**
   * Notifies web app that bot left a guild
   */
  public async sendGuildLeft(data: GuildLeftData): Promise<void> {
    await this.sendWebhook("guild-left", {
      event: "guild.left",
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /**
   * Notifies web app that setup is complete
   */
  public async sendSetupComplete(data: SetupCompleteData): Promise<void> {
    await this.sendWebhook("setup-complete", {
      event: "guild.setup_complete",
      timestamp: new Date().toISOString(),
      data,
    });
  }
}

// Singleton instance
let webhookClient: WebhookClient | null = null;

/**
 * Gets the webhook client instance
 * Returns null if environment variables are not configured
 */
export function getWebhookClient(): WebhookClient | null {
  if (!webhookClient) {
    try {
      webhookClient = new WebhookClient();
    } catch (error) {
      container.logger.warn("Webhook client not initialized:", error);
      return null;
    }
  }
  return webhookClient;
}