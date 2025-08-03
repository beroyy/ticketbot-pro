import { createHmac } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Webhook validation and utilities for bot integration
 */

export interface WebhookHeaders {
  signature: string;
  timestamp: string;
}

export interface WebhookPayload<T = unknown> {
  event: string;
  timestamp: string;
  data: T;
}

// Guild Events
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
  messageType: 'customer' | 'staff' | 'bot';
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
  action: 'created' | 'updated' | 'deleted';
  changes?: Record<string, any>;
}

export interface TeamMemberData {
  guildId: string;
  userId: string;
  username: string;
  roleId: string;
  roleName: string;
  action: 'assigned' | 'unassigned';
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
  | 'guild.joined'
  | 'guild.left'
  | 'guild.setup_complete'
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.deleted'
  | 'ticket.message_sent'
  | 'ticket.status_changed'
  | 'ticket.claimed'
  | 'ticket.closed'
  | 'team.role_created'
  | 'team.role_updated'
  | 'team.role_deleted'
  | 'team.member_assigned'
  | 'team.member_unassigned'
  | 'member.left';

export type BotEvent = 
  | { type: 'guild.joined'; data: GuildJoinedData }
  | { type: 'guild.left'; data: GuildLeftData }
  | { type: 'guild.setup_complete'; data: SetupCompleteData }
  | { type: 'ticket.created'; data: TicketCreatedData }
  | { type: 'ticket.updated'; data: TicketUpdatedData }
  | { type: 'ticket.deleted'; data: TicketDeletedData }
  | { type: 'ticket.message_sent'; data: TicketMessageData }
  | { type: 'ticket.status_changed'; data: TicketStatusData }
  | { type: 'ticket.claimed'; data: TicketStatusData }
  | { type: 'ticket.closed'; data: TicketStatusData }
  | { type: 'team.role_created'; data: TeamRoleData }
  | { type: 'team.role_updated'; data: TeamRoleData }
  | { type: 'team.role_deleted'; data: TeamRoleData }
  | { type: 'team.member_assigned'; data: TeamMemberData }
  | { type: 'team.member_unassigned'; data: TeamMemberData }
  | { type: 'member.left'; data: MemberLeftData };

export interface UnifiedWebhookPayload {
  event: BotEvent;
  timestamp: string;
}

/**
 * Validates webhook signature to ensure request is from our bot
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  // Prevent replay attacks - reject if timestamp is older than 5 minutes
  const timestampMs = parseInt(timestamp);
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (isNaN(timestampMs) || now - timestampMs > fiveMinutes) {
    return false;
  }

  // Create expected signature
  const signaturePayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(signaturePayload)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  return signature === `sha256=${expectedSignature}`;
}

/**
 * Extracts and validates webhook headers from request
 */
export function getWebhookHeaders(request: NextRequest): WebhookHeaders | null {
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");

  if (!signature || !timestamp) {
    return null;
  }

  return { signature, timestamp };
}

/**
 * Validates and parses webhook request
 */
export async function validateWebhookRequest<T = unknown>(
  request: NextRequest,
  secret: string
): Promise<{ valid: true; payload: WebhookPayload<T> } | { valid: false; error: string }> {
  try {
    // Get headers
    const headers = getWebhookHeaders(request);
    if (!headers) {
      return { valid: false, error: "Missing webhook headers" };
    }

    // Get body
    const body = await request.text();
    if (!body) {
      return { valid: false, error: "Empty request body" };
    }

    // Validate signature
    const isValid = validateWebhookSignature(
      body,
      headers.signature,
      headers.timestamp,
      secret
    );

    if (!isValid) {
      return { valid: false, error: "Invalid webhook signature" };
    }

    // Parse payload
    let payload: WebhookPayload<T>;
    try {
      payload = JSON.parse(body);
    } catch {
      return { valid: false, error: "Invalid JSON payload" };
    }

    // Validate payload structure
    if (!payload.event || !payload.timestamp || !payload.data) {
      return { valid: false, error: "Invalid payload structure" };
    }

    return { valid: true, payload };
  } catch (error) {
    console.error("Webhook validation error:", error);
    return { valid: false, error: "Internal validation error" };
  }
}

/**
 * Validates and parses unified bot event webhook request
 */
export async function validateUnifiedWebhookRequest(
  request: NextRequest,
  secret: string
): Promise<{ valid: true; payload: UnifiedWebhookPayload } | { valid: false; error: string }> {
  try {
    // Get headers
    const headers = getWebhookHeaders(request);
    if (!headers) {
      return { valid: false, error: "Missing webhook headers" };
    }

    // Get body
    const body = await request.text();
    if (!body) {
      return { valid: false, error: "Empty request body" };
    }

    // Validate signature
    const isValid = validateWebhookSignature(
      body,
      headers.signature,
      headers.timestamp,
      secret
    );

    if (!isValid) {
      return { valid: false, error: "Invalid webhook signature" };
    }

    // Parse payload
    let payload: UnifiedWebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch {
      return { valid: false, error: "Invalid JSON payload" };
    }

    // Validate payload structure
    if (!payload.event || !payload.timestamp) {
      return { valid: false, error: "Invalid payload structure" };
    }

    // Validate event structure
    if (!payload.event.type || !payload.event.data) {
      return { valid: false, error: "Invalid event structure" };
    }

    return { valid: true, payload };
  } catch (error) {
    console.error("Webhook validation error:", error);
    return { valid: false, error: "Internal validation error" };
  }
}

/**
 * Creates a webhook response with consistent format
 */
export function webhookResponse(
  success: boolean,
  message: string,
  status: number = success ? 200 : 400
): Response {
  return Response.json(
    {
      success,
      message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}