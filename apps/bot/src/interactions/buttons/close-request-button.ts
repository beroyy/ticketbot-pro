import { createButtonHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import { ChannelOps, MessageOps } from "@bot/lib/discord-operations";
import {
  err,
  ok,
  createButtonErrorHandler,
  ErrorResponses,
  EPHEMERAL_FLAG,
} from "@bot/lib/discord-utils";
import type { ButtonInteraction, TextChannel } from "discord.js";
import {
  Ticket,
  User as UserDomain,
  TicketLifecycle,
  getSettingsUnchecked,
} from "@ticketsbot/core/domains";
import { parseDiscordId } from "@ticketsbot/core";
import { container } from "@sapphire/framework";
import { withTransaction, afterTransaction } from "@ticketsbot/core/context";
import { captureEvent } from "@ticketsbot/core/analytics";

// Pattern matches both close_confirm_<id> and close_cancel_<id>
const closeRequestPattern = /^close_(confirm|cancel)(?:_(.+))?$/;

const closeRequestHandler = createButtonHandler({
  pattern: closeRequestPattern,

  handler: async (interaction: ButtonInteraction) => {
    if (!interaction.channel || !interaction.guild) return err("No channel or guild");

    const match = interaction.customId.match(closeRequestPattern);
    if (!match) return err("Invalid pattern match");

    const action = match[1] as "confirm" | "cancel";
    const requestId = match[2] || null;

    const ticket = await Ticket.findByChannelId(parseDiscordId(interaction.channelId));
    if (!ticket) {
      await interaction.reply(ErrorResponses.notTicketChannel());
      return err("Not a ticket channel");
    }

    // Verify opener only
    if (interaction.user.id !== ticket.openerId.toString()) {
      await interaction.reply(ErrorResponses.notTicketOpener(action));
      return err("Not ticket opener");
    }

    // Verify close request exists if request ID provided
    if (requestId && ticket.closeRequestId !== requestId) {
      await interaction.reply({
        content: "❌ This close request is no longer valid.",
        flags: EPHEMERAL_FLAG,
      });
      return err("Invalid close request");
    }

    // Ensure user exists
    await UserDomain.ensure(
      parseDiscordId(interaction.user.id),
      interaction.user.username,
      interaction.user.discriminator,
      interaction.user.displayAvatarURL()
    );

    if (action === "confirm") {
      // Approved - close ticket
      const closeEmbed = MessageOps.closeRequest.approvedEmbed(ticket.id);

      await interaction.update({
        embeds: [closeEmbed],
        components: [],
      });

      const guild = interaction.guild;
      const userId = interaction.user.id;

      try {
        await withTransaction(async () => {
          // Close ticket using lifecycle domain
          await TicketLifecycle.close({
            ticketId: ticket.id,
            closedById: userId,
            reason: "Close request approved by opener",
            deleteChannel: false,
            notifyOpener: true,
          });

          // Get guild settings
          const settings = await getSettingsUnchecked(guild.id);
          if (!settings) {
            throw new Error("Guild not properly configured");
          }

          // Schedule Discord operations after transaction
          afterTransaction(async () => {
            try {
              const channel = interaction.channel as TextChannel;

              // Archive or delete the channel
              const archiveResult = await ChannelOps.ticket.archive(
                channel,
                guild,
                settings,
                userId
              );

              // Track event
              await captureEvent("ticket_closed", {
                ticketId: ticket.id,
                closedBy: userId,
                reason: "Close request approved by opener",
                channelDeleted: archiveResult.deleted,
                channelArchived: archiveResult.archived,
              });
            } catch (error) {
              container.logger.error("Error in Discord operations:", error);
            }
          });
        });
      } catch (error) {
        container.logger.error("Failed to close ticket:", error);
      }
    } else {
      // Denied - cancel close request
      try {
        await TicketLifecycle.cancelCloseRequest(ticket.id, parseDiscordId(interaction.user.id));

        await interaction.update({
          content: MessageOps.closeRequest.deniedMessage(),
          embeds: [],
          components: [],
        });

        // Track event
        await captureEvent("ticket_close_request_denied", {
          ticketId: ticket.id,
          deniedBy: interaction.user.id,
        });
      } catch (error) {
        container.logger.error("Failed to cancel close request:", error);
        await interaction.reply({
          content: "❌ Failed to cancel the close request.",
          flags: EPHEMERAL_FLAG,
        });
        return err("Failed to cancel close request");
      }
    }

    return ok(undefined);
  },

  errorHandler: createButtonErrorHandler("close request button handler"),
});

export const CloseRequestButtonHandler = createInteractionHandler("CloseRequestButton", [
  closeRequestHandler,
]);
