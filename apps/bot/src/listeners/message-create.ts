import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { Event } from "@ticketsbot/core/domains";
import { findByChannelId } from "@ticketsbot/core/domains/ticket";
import { TranscriptOps } from "@bot/lib/discord-operations";
import { container } from "@sapphire/framework";
import { Actor, type DiscordActor } from "@ticketsbot/core/context";
import { getWebhookClient } from "@bot/lib/webhook-client";
import type { Message } from "discord.js";

const ROLE_PREFIX = "Tickets ";

export const MessageCreateListener = ListenerFactory.on(
  "messageCreate",
  async (message: Message) => {
    if (message.system || !message.guild) return;

    try {
      // Check if this is a ticket channel using static method (no context needed)
      const ticket = await findByChannelId(message.channelId);
      if (!ticket || ticket.status === "CLOSED") return;

      // Create actor context for the message author (not the bot)
      const actor: DiscordActor = {
        type: "discord_user",
        properties: {
          userId: message.author.id,
          username: message.author.username,
          guildId: message.guildId!,
          permissions: 0n,
        },
      };

      await Actor.Context.provideAsync(actor, async () => {
        // Store ALL messages in transcripts
        if (message.author.bot) {
          await TranscriptOps.store.botMessage(message, ticket);
        } else {
          await TranscriptOps.store.userMessage(message);
        }

        // Log non-bot messages as events for activity tracking
        if (!message.author.bot) {
          // Determine message type
          const member =
            message.member ||
            (await message.guild!.members.fetch(message.author.id).catch(() => null));
          const hasTicketRole =
            member?.roles.cache.some((role) => role.name.startsWith(ROLE_PREFIX)) ?? false;
          const messageType = hasTicketRole ? "staff" : "customer";

          await Event.create({
            guildId: message.guildId!,
            actorId: message.author.id,
            category: "TICKET",
            action: `message.${messageType}_sent`,
            targetType: "TICKET",
            targetId: ticket.id.toString(),
            ticketId: ticket.id,
            metadata: {
              messageId: message.id,
              ticketNumber: ticket.number,
              messageLength: message.content.length,
              hasAttachments: message.attachments.size > 0,
            },
          });

          // Send webhook notification for real-time updates
          const webhookClient = getWebhookClient();
          if (webhookClient) {
            await webhookClient.sendEvent({
              type: 'ticket.message_sent',
              data: {
                guildId: message.guildId!,
                ticketId: ticket.id,
                ticketNumber: ticket.number,
                messageId: message.id,
                authorId: message.author.id,
                authorUsername: message.author.username,
                messageType: messageType as 'customer' | 'staff',
                hasAttachments: message.attachments.size > 0,
                messageLength: message.content.length,
              }
            });
          }
        }
      });
    } catch (error) {
      container.logger.error(`Failed to handle message in ticket ${message.channelId}:`, error);
    }
  }
);
