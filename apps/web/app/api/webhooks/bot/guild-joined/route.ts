import type { NextRequest } from "next/server";
import { validateWebhookRequest, webhookResponse, type GuildJoinedData } from "@/lib/webhooks";
import { ensure as ensureGuild, update as updateGuild } from "@ticketsbot/core/domains/guild";

/**
 * POST /api/webhooks/bot/guild-joined
 * 
 * Called when the bot joins a new Discord guild
 * Updates database to reflect bot installation
 */
export async function POST(request: NextRequest) {
  // Get webhook secret from environment
  const webhookSecret = process.env.BOT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("BOT_WEBHOOK_SECRET not configured");
    return webhookResponse(false, "Webhook not configured", 500);
  }

  // Validate webhook request
  const validation = await validateWebhookRequest<GuildJoinedData>(request, webhookSecret);
  if (!validation.valid) {
    console.warn("Invalid webhook request:", validation.error);
    return webhookResponse(false, validation.error, 401);
  }

  const { data } = validation.payload;

  try {
    // Validate required fields
    if (!data.guildId || !data.guildName) {
      return webhookResponse(false, "Missing required guild data", 400);
    }

    // Ensure guild exists in database
    await ensureGuild(data.guildId, data.guildName, data.ownerId);

    // Update bot installation status
    await updateGuild(data.guildId, {
      botInstalled: true,
      memberCount: data.memberCount || 0,
    });

    console.log(`Bot joined guild: ${data.guildName} (${data.guildId})`);

    return webhookResponse(true, "Guild joined successfully");
  } catch (error) {
    console.error("Error processing guild-joined webhook:", error);
    return webhookResponse(false, "Failed to process guild join", 500);
  }
}