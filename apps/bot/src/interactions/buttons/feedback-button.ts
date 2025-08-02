import { createButtonHandler, createInteractionHandler } from "@bot/lib/sapphire-extensions";
import type { ButtonInteraction } from "discord.js";
import { User as UserDomain, Transcripts } from "@ticketsbot/core/domains";
import { parseDiscordId } from "@ticketsbot/core";
import {
  err,
  ok,
  createButtonErrorHandler,
  ErrorResponses,
  EPHEMERAL_FLAG,
} from "@bot/lib/discord-utils";
import { MessageOps } from "@bot/lib/discord-operations";
import { container } from "@sapphire/framework";

const feedbackHandler = createButtonHandler({
  pattern: /^feedback_(\d+)_(\d+)$/,

  handler: async (interaction: ButtonInteraction) => {
    const match = interaction.customId.match(/^feedback_(\d+)_(\d+)$/);
    if (!match || !match[1] || !match[2]) return err("Invalid feedback button format");

    const ticketId = parseInt(match[1]);
    const rating = parseInt(match[2]);

    // Validate rating
    if (rating < 1 || rating > 5) {
      await interaction.reply(ErrorResponses.invalidRating());
      return err("Invalid rating");
    }

    // Ensure user exists
    await UserDomain.ensure(
      parseDiscordId(interaction.user.id),
      interaction.user.username,
      interaction.user.discriminator,
      interaction.user.displayAvatarURL()
    );

    try {
      // Submit feedback using Transcripts domain
      await Transcripts.submitFeedback({
        ticketId,
        rating,
        submittedById: parseDiscordId(interaction.user.id),
      });

      // Update message with success embed
      const successEmbed = MessageOps.feedback.successEmbed(rating);
      await interaction.update({
        embeds: [successEmbed],
        components: [],
      });

      return ok(undefined);
    } catch (error) {
      container.logger.error("Failed to submit feedback:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit feedback";

      if (errorMessage.includes("already submitted")) {
        await interaction.reply({
          content: "❌ You have already submitted feedback for this ticket.",
          flags: EPHEMERAL_FLAG,
        });
      } else {
        await interaction.reply(ErrorResponses.genericError());
      }

      return err(errorMessage);
    }
  },

  errorHandler: createButtonErrorHandler("feedback button handler"),
});

export const FeedbackButtonHandler = createInteractionHandler("FeedbackButton", [feedbackHandler]);
