import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { parseDiscordId } from "@ticketsbot/core";
import { update as updateGuild } from "@ticketsbot/core/domains";
import { getWebhookClient } from "@bot/lib/webhook-client";

export const GuildDeleteListener = ListenerFactory.on("guildDelete", async (guild: Guild) => {
  const { logger } = container;
  logger.info(`Left guild: ${guild.name} (${guild.id})`);

  try {
    // Update botInstalled status to false
    const guildId = parseDiscordId(guild.id);
    await updateGuild(guildId, { botInstalled: false });
    
    logger.info(`✅ Updated guild ${guild.name} with botInstalled = false`);

    // Send webhook notification
    const webhookClient = getWebhookClient();
    if (webhookClient) {
      await webhookClient.sendGuildLeft({
        guildId: guildId,
      });
    }

    // Log the removal
    logger.info(
      `✅ Completed cleanup for guild ${guild.name} - bot was removed or guild was deleted`
    );
  } catch (error) {
    logger.error(`❌ Failed to clean up after leaving guild ${guild.name}:`, error);
  }
});