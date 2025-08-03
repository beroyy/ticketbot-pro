import { ListenerFactory } from "@bot/lib/sapphire-extensions";
import { container } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { ensure as ensureGuild, update as updateGuild, User, Role } from "@ticketsbot/core/domains";
import { parseDiscordId } from "@ticketsbot/core";
import { getWebhookClient } from "@bot/lib/webhook-client";

export const GuildCreateListener = ListenerFactory.on("guildCreate", async (guild: Guild) => {
  const { logger } = container;
  logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

  try {
    // 1. Create guild record
    await ensureGuild(parseDiscordId(guild.id), guild.name, parseDiscordId(guild.ownerId));
    
    // 2. Update botInstalled status
    await updateGuild(parseDiscordId(guild.id), { botInstalled: true });
    
    logger.info(`✅ Guild ${guild.name} added to database with botInstalled = true`);

    // 2. Fetch owner info
    const owner = await guild.fetchOwner();
    logger.info(`📋 Fetched owner information for ${owner.user.tag}`);

    // 3. Ensure owner exists in user database
    await User.ensure(
      parseDiscordId(owner.id),
      owner.user.username,
      owner.user.discriminator,
      owner.user.displayAvatarURL()
    );
    logger.info(`👤 Ensured owner ${owner.user.tag} exists in database`);

    // 4. Create default team roles
    await Role.ensureDefaultRoles(parseDiscordId(guild.id));
    logger.info(`🎭 Created default team roles for guild ${guild.name}`);

    // 5. Assign owner to admin role
    const adminRole = await Role.getRoleByName(parseDiscordId(guild.id), "admin");
    if (adminRole) {
      await Role.assignRole(adminRole.id, parseDiscordId(owner.id));
      logger.info(`👑 Assigned admin role to guild owner ${owner.user.tag}`);
    }

    logger.info(
      `✅ Completed setup for guild ${guild.name} - owner ${owner.user.tag} now has admin permissions`
    );

    // 6. Send webhook notification
    const webhookClient = getWebhookClient();
    if (webhookClient) {
      await webhookClient.sendEvent({
        type: 'guild.joined',
        data: {
          guildId: parseDiscordId(guild.id),
          guildName: guild.name,
          ownerId: parseDiscordId(guild.ownerId),
          memberCount: guild.memberCount,
        }
      });
    }
  } catch (error) {
    logger.error(`❌ Failed to complete setup for guild ${guild.name}:`, error);
  }
});
