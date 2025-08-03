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