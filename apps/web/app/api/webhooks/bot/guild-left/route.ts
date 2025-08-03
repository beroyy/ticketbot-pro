import type { NextRequest } from "next/server";
import { validateWebhookRequest, webhookResponse, type GuildLeftData } from "@/lib/webhooks";
import { update as updateGuild } from "@ticketsbot/core/domains/guild";
import { prisma } from "@ticketsbot/core/prisma/client";

// Define TicketStatus enum values directly
const TicketStatus = {
  OPEN: "OPEN",
  CLAIMED: "CLAIMED", 
  CLOSED: "CLOSED"
} as const;

/**
 * POST /api/webhooks/bot/guild-left
 * 
 * Called when the bot leaves or is removed from a Discord guild
 * Updates database to reflect bot removal and closes any open tickets
 */
export async function POST(request: NextRequest) {
  // Get webhook secret from environment
  const webhookSecret = process.env.BOT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("BOT_WEBHOOK_SECRET not configured");
    return webhookResponse(false, "Webhook not configured", 500);
  }

  // Validate webhook request
  const validation = await validateWebhookRequest<GuildLeftData>(request, webhookSecret);
  if (!validation.valid) {
    console.warn("Invalid webhook request:", validation.error);
    return webhookResponse(false, validation.error, 401);
  }

  const { data } = validation.payload;

  try {
    // Validate required fields
    if (!data.guildId) {
      return webhookResponse(false, "Missing guild ID", 400);
    }

    // Update bot installation status
    await updateGuild(data.guildId, {
      botInstalled: false,
    });

    // Close all open tickets for this guild
    // Using direct Prisma since we're in a system context
    const result = await prisma.ticket.updateMany({
      where: {
        guildId: data.guildId,
        status: { in: [TicketStatus.OPEN, TicketStatus.CLAIMED] },
        deletedAt: null,
      },
      data: {
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    if (result.count > 0) {
      console.log(`Closed ${result.count} tickets for guild ${data.guildId}`);
    }

    console.log(`Bot left guild: ${data.guildId}`);

    return webhookResponse(true, "Guild left successfully");
  } catch (error) {
    console.error("Error processing guild-left webhook:", error);
    return webhookResponse(false, "Failed to process guild leave", 500);
  }
}