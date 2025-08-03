import type { NextRequest } from "next/server";
import { validateUnifiedWebhookRequest, webhookResponse, type BotEvent } from "@/lib/webhooks";
import { botEvents } from "@/lib/sse/bot-events";
import { User } from "@ticketsbot/core/domains";

/**
 * POST /api/webhooks/bot/events
 * 
 * Unified webhook endpoint for all bot events
 * Only triggers SSE notifications - no database operations
 */
export async function POST(request: NextRequest) {
  // Get webhook secret from environment
  const webhookSecret = process.env.BOT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("BOT_WEBHOOK_SECRET not configured");
    return webhookResponse(false, "Webhook not configured", 500);
  }

  // Validate webhook request
  const validation = await validateUnifiedWebhookRequest(request, webhookSecret);
  if (!validation.valid) {
    console.warn("Invalid webhook request:", validation.error);
    return webhookResponse(false, validation.error, 401);
  }

  const { event } = validation.payload;

  try {
    // Route events to appropriate SSE broadcasters
    await handleBotEvent(event);

    return webhookResponse(true, `Event ${event.type} processed successfully`);
  } catch (error) {
    console.error(`Error processing ${event.type} webhook:`, error);
    return webhookResponse(false, "Failed to process event", 500);
  }
}

/**
 * Routes bot events to appropriate SSE broadcasters
 */
async function handleBotEvent(event: BotEvent): Promise<void> {
  switch (event.type) {
    case 'guild.joined': {
      const { data } = event;
      if (data.ownerId) {
        try {
          // Find the Better Auth user by Discord ID
          const betterAuthUser = await User.findBetterAuthUserByDiscordId(data.ownerId);
          
          if (betterAuthUser) {
            // Notify via SSE
            botEvents.notifyUser(betterAuthUser.id, event);
            console.log(`[SSE] Sent guild.joined notification to user ${betterAuthUser.email} for guild ${data.guildName}`);
          }
        } catch (error) {
          // Don't fail the webhook if SSE notification fails
          console.error("[SSE] Failed to send guild.joined notification:", error);
        }
      }
      break;
    }

    case 'guild.left': {
      const { data } = event;
      // Notify all guild members
      botEvents.notifyGuild(data.guildId, event);
      console.log(`[SSE] Sent guild.left notification for guild ${data.guildId}`);
      break;
    }

    case 'guild.setup_complete': {
      const { data } = event;
      // Notify guild members about setup completion
      botEvents.notifyGuild(data.guildId, event);
      console.log(`[SSE] Sent guild.setup_complete notification for guild ${data.guildId}`);
      break;
    }

    case 'ticket.created': {
      const { data } = event;
      // Notify guild members about new ticket
      botEvents.notifyGuild(data.guildId, event);
      console.log(`[SSE] Sent ticket.created notification for ticket #${data.ticketNumber}`);
      break;
    }

    case 'ticket.updated': {
      const { data } = event;
      // Notify both guild and specific ticket channels
      botEvents.notifyGuild(data.guildId, event);
      botEvents.notifyTicket(data.guildId, data.ticketId, event);
      console.log(`[SSE] Sent ticket.updated notification for ticket #${data.ticketNumber}`);
      break;
    }

    case 'ticket.deleted': {
      const { data } = event;
      // Notify guild members
      botEvents.notifyGuild(data.guildId, event);
      console.log(`[SSE] Sent ticket.deleted notification for ticket #${data.ticketNumber}`);
      break;
    }

    case 'ticket.message_sent': {
      const { data } = event;
      // Notify both guild and specific ticket channels
      botEvents.notifyGuild(data.guildId, event);
      botEvents.notifyTicket(data.guildId, data.ticketId, event);
      console.log(`[SSE] Sent ticket.message_sent notification for ticket #${data.ticketNumber}`);
      break;
    }

    case 'ticket.status_changed':
    case 'ticket.claimed':
    case 'ticket.closed': {
      const { data } = event;
      // Notify both guild and specific ticket channels
      botEvents.notifyGuild(data.guildId, event);
      botEvents.notifyTicket(data.guildId, data.ticketId, event);
      console.log(`[SSE] Sent ${event.type} notification for ticket #${data.ticketNumber}`);
      break;
    }

    case 'team.role_created':
    case 'team.role_updated':
    case 'team.role_deleted': {
      const { data } = event;
      // Notify guild members about team role changes
      botEvents.notifyGuild(data.guildId, event);
      console.log(`[SSE] Sent ${event.type} notification for role ${data.roleName}`);
      break;
    }

    case 'team.member_assigned':
    case 'team.member_unassigned': {
      const { data } = event;
      // Notify both the affected user and guild members
      try {
        const betterAuthUser = await User.findBetterAuthUserByDiscordId(data.userId);
        if (betterAuthUser) {
          botEvents.notifyUser(betterAuthUser.id, event);
        }
      } catch (error) {
        console.error(`[SSE] Failed to notify user ${data.userId}:`, error);
      }
      
      botEvents.notifyGuild(data.guildId, event);
      console.log(`[SSE] Sent ${event.type} notification for ${data.username}`);
      break;
    }

    case 'member.left': {
      const { data } = event;
      // Notify guild members that someone left
      botEvents.notifyGuild(data.guildId, event);
      console.log(`[SSE] Sent member.left notification for ${data.username} in guild ${data.guildId}`);
      break;
    }

    default: {
      // Type-safe exhaustive check
      const _exhaustiveCheck: never = event;
      console.warn(`[SSE] Unhandled event type: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}