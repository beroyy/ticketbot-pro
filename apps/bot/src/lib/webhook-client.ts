import { fetch, FetchResultTypes, FetchMethods } from "@sapphire/fetch";
import { createHmac } from "crypto";
import { container } from "@sapphire/framework";
import { getWebUrl } from "@ticketsbot/core";

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

// Ticket Events
export interface TicketMessageData {
  guildId: string;
  ticketId: number;
  ticketNumber: number;
  messageId: string;
  authorId: string;
  authorUsername: string;
  messageType: "customer" | "staff" | "bot";
  hasAttachments: boolean;
  messageLength: number;
}

export interface TicketStatusData {
  guildId: string;
  ticketId: number;
  ticketNumber: number;
  oldStatus: string;
  newStatus: string;
  actorId: string;
  reason?: string;
}

export interface TicketCreatedData {
  guildId: string;
  ticketId: number;
  ticketNumber: number;
  subject: string;
  openerId: string;
  openerUsername: string;
  panelId?: string;
  categoryId?: string;
}

export interface TicketUpdatedData {
  guildId: string;
  ticketId: number;
  ticketNumber: number;
  changes: {
    subject?: { old: string; new: string };
    priority?: { old: string; new: string };
    tags?: { added: string[]; removed: string[] };
  };
  actorId: string;
}

export interface TicketDeletedData {
  guildId: string;
  ticketId: number;
  ticketNumber: number;
  deletedBy: string;
  reason?: string;
}

// Team Events
export interface TeamRoleData {
  guildId: string;
  roleId: string;
  roleName: string;
  action: "created" | "updated" | "deleted";
  changes?: Record<string, any>;
}

export interface TeamMemberData {
  guildId: string;
  userId: string;
  username: string;
  roleId: string;
  roleName: string;
  action: "assigned" | "unassigned";
}

// Member Events
export interface MemberLeftData {
  guildId: string;
  userId: string;
  username: string;
  hadOpenTickets: boolean;
  wasTeamMember: boolean;
}

// Unified Bot Event Type
export type BotEventType =
  | "guild.joined"
  | "guild.left"
  | "guild.setup_complete"
  | "ticket.created"
  | "ticket.updated"
  | "ticket.deleted"
  | "ticket.message_sent"
  | "ticket.status_changed"
  | "ticket.claimed"
  | "ticket.closed"
  | "team.role_created"
  | "team.role_updated"
  | "team.role_deleted"
  | "team.member_assigned"
  | "team.member_unassigned"
  | "member.left";

export type BotEvent =
  | { type: "guild.joined"; data: GuildJoinedData }
  | { type: "guild.left"; data: GuildLeftData }
  | { type: "guild.setup_complete"; data: SetupCompleteData }
  | { type: "ticket.created"; data: TicketCreatedData }
  | { type: "ticket.updated"; data: TicketUpdatedData }
  | { type: "ticket.deleted"; data: TicketDeletedData }
  | { type: "ticket.message_sent"; data: TicketMessageData }
  | { type: "ticket.status_changed"; data: TicketStatusData }
  | { type: "ticket.claimed"; data: TicketStatusData }
  | { type: "ticket.closed"; data: TicketStatusData }
  | { type: "team.role_created"; data: TeamRoleData }
  | { type: "team.role_updated"; data: TeamRoleData }
  | { type: "team.role_deleted"; data: TeamRoleData }
  | { type: "team.member_assigned"; data: TeamMemberData }
  | { type: "team.member_unassigned"; data: TeamMemberData }
  | { type: "member.left"; data: MemberLeftData };

export interface UnifiedWebhookPayload {
  event: BotEvent;
  timestamp: string;
}

export class WebhookClient {
  private readonly baseUrl: string;
  private readonly secret: string;
  private readonly logger = container.logger;

  constructor() {
    const webhookSecret = process.env.BOT_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("BOT_WEBHOOK_SECRET environment variable is not set");
    }

    this.baseUrl = getWebUrl().replace(/\/$/, ""); // Remove trailing slash
    this.secret = webhookSecret;
  }

  /**
   * Creates webhook signature for authentication
   */
  private createSignature(payload: string, timestamp: string): string {
    const signaturePayload = `${timestamp}.${payload}`;
    const signature = createHmac("sha256", this.secret).update(signaturePayload).digest("hex");
    return `sha256=${signature}`;
  }

  /**
   * Sends a unified bot event to the web application
   * This is the preferred method for all new event types
   */
  public async sendEvent(event: BotEvent): Promise<void> {
    const url = `${this.baseUrl}/api/webhooks/bot/events`;
    const timestamp = Date.now().toString();
    const payload: UnifiedWebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
    };
    const body = JSON.stringify(payload);
    const signature = this.createSignature(body, timestamp);

    try {
      this.logger.debug(`Sending unified event ${event.type}`, {
        event,
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

      this.logger.info(`✅ Unified event ${event.type} sent successfully`, {
        response,
      });
    } catch (error) {
      this.logger.error(`❌ Failed to send unified event ${event.type}`, {
        error: error instanceof Error ? error.message : String(error),
        url,
      });

      // Don't throw - webhook failures shouldn't break bot operations
    }
  }

  /**
   * @deprecated Use sendEvent() instead
   * Notifies web app that bot joined a guild
   */
  public async sendGuildJoined(data: GuildJoinedData): Promise<void> {
    // Use the new unified method
    await this.sendEvent({ type: "guild.joined", data });
  }

  /**
   * @deprecated Use sendEvent() instead
   * Notifies web app that bot left a guild
   */
  public async sendGuildLeft(data: GuildLeftData): Promise<void> {
    // Use the new unified method
    await this.sendEvent({ type: "guild.left", data });
  }

  /**
   * @deprecated Use sendEvent() instead
   * Notifies web app that setup is complete
   */
  public async sendSetupComplete(data: SetupCompleteData): Promise<void> {
    // Use the new unified method
    await this.sendEvent({ type: "guild.setup_complete", data });
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
