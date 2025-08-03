import type { NextRequest } from "next/server";
import { validateWebhookRequest, webhookResponse, type SetupCompleteData } from "@/lib/webhooks";
import { update as updateGuild } from "@ticketsbot/core/domains/guild";
import { prisma } from "@ticketsbot/core/prisma/client";

/**
 * POST /api/webhooks/bot/setup-complete
 * 
 * Called when the bot completes setup in a Discord guild
 * Updates guild configuration with selected channels and roles
 */
export async function POST(request: NextRequest) {
  // Get webhook secret from environment
  const webhookSecret = process.env.BOT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("BOT_WEBHOOK_SECRET not configured");
    return webhookResponse(false, "Webhook not configured", 500);
  }

  // Validate webhook request
  const validation = await validateWebhookRequest<SetupCompleteData>(request, webhookSecret);
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

    // Build update data object
    const updateData: any = {
      setupComplete: true,
    };

    if (data.supportCategoryId) {
      updateData.supportCategoryId = data.supportCategoryId;
    }

    if (data.transcriptsChannelId) {
      updateData.transcriptsChannel = data.transcriptsChannelId;
    }

    if (data.logChannelId) {
      updateData.logChannel = data.logChannelId;
    }

    // Update guild configuration
    await updateGuild(data.guildId, updateData);

    // If a default support role was created, ensure it exists
    if (data.defaultRoleId) {
      // Check if the Support role already exists
      const existingRole = await prisma.guildRole.findFirst({
        where: {
          guildId: data.guildId,
          name: "Support",
        },
      });

      if (!existingRole) {
        // Create default Support role with standard permissions
        await prisma.guildRole.create({
          data: {
            guildId: data.guildId,
            name: "Support",
            discordRoleId: data.defaultRoleId,
            permissions: BigInt("0x1ffffff"), // Default support permissions
          },
        });
      } else if (!existingRole.discordRoleId) {
        // Update existing role with Discord role ID
        await prisma.guildRole.update({
          where: { id: existingRole.id },
          data: { discordRoleId: data.defaultRoleId },
        });
      }
    }

    console.log(`Setup completed for guild: ${data.guildId}`);

    return webhookResponse(true, "Setup completed successfully");
  } catch (error) {
    console.error("Error processing setup-complete webhook:", error);
    return webhookResponse(false, "Failed to process setup completion", 500);
  }
}