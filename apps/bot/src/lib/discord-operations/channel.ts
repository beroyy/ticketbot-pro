import {
  type Guild,
  type TextChannel,
  type CategoryChannel,
  ChannelType,
  PermissionFlagsBits,
  type OverwriteResolvable,
} from "discord.js";
import { Role, getSettingsUnchecked } from "@ticketsbot/core/domains";
import { createTicketChannelName } from "@ticketsbot/core";

interface TicketInfo {
  id: number;
  number: number;
  openerId: string;
  subject?: string | null;
}

interface GuildSettings {
  ticketCategoryId?: string | null;
  ticketNameFormat?: string | null;
  archiveMode?: string | null;
  archiveCategoryId?: string | null;
  defaultCategoryId?: string | null;
}

// Channel operations namespace
export const ChannelOps = {
  ticket: {
    create: async (
      guild: Guild,
      ticket: TicketInfo,
      settings: GuildSettings
    ): Promise<TextChannel> => {
      // Get the opener's username for channel naming
      const opener = await guild.members.fetch(ticket.openerId).catch(() => null);
      const username = opener?.user.username || "unknown";

      const channelName = createTicketChannelName(
        ticket.number,
        username,
        undefined, // panelChannelPrefix - could be added if needed
        settings.ticketNameFormat ?? undefined
      );

      // Find or create ticket category
      let categoryId = settings.ticketCategoryId;
      if (!categoryId) {
        const category = await guild.channels.create({
          name: "Support Tickets",
          type: ChannelType.GuildCategory,
        });
        categoryId = category.id;
      }

      // Create the channel with proper permissions
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId ?? undefined,
        topic: `Ticket #${ticket.number} - Opened by <@${ticket.openerId}>`,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: ticket.openerId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
        ],
      });

      // Add team role permissions
      const teamRoles = await Role.getRoles(guild.id);
      for (const role of teamRoles) {
        if (role.discordRoleId) {
          await channel.permissionOverwrites.create(role.discordRoleId, {
            ViewChannel: true,
            SendMessages: true,
            ManageMessages: true,
            AttachFiles: true,
            EmbedLinks: true,
          });
        }
      }

      return channel;
    },

    createWithPermissions: async (
      guild: Guild,
      ticket: TicketInfo,
      panel?: { categoryId?: string | null },
      teamRoleIds: string[] = []
    ): Promise<TextChannel> => {
      const settings = await getSettingsUnchecked(guild.id);
      const categoryId = panel?.categoryId || settings?.defaultCategoryId || null;

      const channelName = createTicketChannelName(ticket.number, ticket.openerId.toString());

      // Build permission overwrites
      const overwrites: OverwriteResolvable[] = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: ticket.openerId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
      ];

      // Add team role permissions
      for (const roleId of teamRoleIds) {
        overwrites.push({
          id: roleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageMessages,
          ],
        });
      }

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId || undefined,
        permissionOverwrites: overwrites,
        reason: `Ticket #${ticket.number} created by ${ticket.openerId}`,
      });

      return channel as TextChannel;
    },

    archive: async (
      channel: TextChannel,
      guild: Guild,
      settings: GuildSettings,
      closedBy: string
    ): Promise<{ archived: boolean; deleted: boolean }> => {
      if (settings.archiveMode !== "archive") {
        // Delete mode
        await channel.delete(`Ticket closed by ${closedBy}`);
        return { archived: false, deleted: true };
      }

      if (!settings.archiveCategoryId) {
        throw new Error("Archive category not configured");
      }

      // Fetch archive category
      const archiveCategory = await guild.channels.fetch(settings.archiveCategoryId);
      if (!archiveCategory || archiveCategory.type !== ChannelType.GuildCategory) {
        throw new Error("Archive category not found or invalid");
      }

      // Check if archive category is full (50 channel limit)
      const childCount = guild.channels.cache.filter((c) => c.parentId === archiveCategory.id).size;
      if (childCount >= 50) {
        // Create overflow category
        const overflowCategory = await ChannelOps.utils.createOverflowCategory(
          guild,
          archiveCategory.name
        );
        await channel.setParent(overflowCategory.id, {
          lockPermissions: false,
          reason: "Archive category full",
        });
      } else {
        await channel.setParent(archiveCategory.id, {
          lockPermissions: false,
          reason: "Ticket archived",
        });
      }

      // Lock the channel
      await ChannelOps.utils.lockArchivedChannel(channel);

      return { archived: true, deleted: false };
    },

    delete: async (guild: Guild, channelId: string): Promise<boolean> => {
      try {
        const channel = guild.channels.cache.get(channelId);
        if (channel) {
          await channel.delete("Ticket closed");
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error deleting ticket channel:", error);
        return false;
      }
    },
  },

  permissions: {
    update: async (
      channel: TextChannel,
      userId: string,
      permissions: {
        view?: boolean;
        send?: boolean;
        history?: boolean;
      }
    ): Promise<void> => {
      const overwrites: any = {};

      if (permissions.view !== undefined) {
        overwrites.ViewChannel = permissions.view;
      }
      if (permissions.send !== undefined) {
        overwrites.SendMessages = permissions.send;
      }
      if (permissions.history !== undefined) {
        overwrites.ReadMessageHistory = permissions.history;
      }

      await channel.permissionOverwrites.edit(userId, overwrites);
    },

    remove: async (channel: TextChannel, userId: string): Promise<void> => {
      await channel.permissionOverwrites.delete(userId);
    },

    // Helper to add a user to channel
    add: async (channel: TextChannel, userId: string) =>
      ChannelOps.permissions.update(channel, userId, {
        view: true,
        send: true,
        history: true,
      }),

    // Helper to remove all permissions
    revoke: async (channel: TextChannel, userId: string) =>
      ChannelOps.permissions.update(channel, userId, {
        view: false,
        send: false,
        history: false,
      }),
  },

  // Helper utilities
  utils: {
    isTicketChannel: (channel: TextChannel) => channel.topic?.includes("Ticket #") ?? false,

    getTicketNumberFromTopic: (channel: TextChannel) => {
      const match = channel.topic?.match(/Ticket #(\d+)/);
      return match && match[1] ? parseInt(match[1]) : null;
    },

    createCategoryIfNeeded: async (guild: Guild, name: string) => {
      const existing = guild.channels.cache.find(
        (ch) => ch.type === ChannelType.GuildCategory && ch.name === name
      );
      if (existing) return existing;

      return guild.channels.create({
        name,
        type: ChannelType.GuildCategory,
      });
    },

    createOverflowCategory: async (guild: Guild, baseName: string): Promise<CategoryChannel> => {
      const overflowCategories = guild.channels.cache
        .filter((c) => c.type === ChannelType.GuildCategory && c.name.startsWith(`${baseName} `))
        .map((c) => {
          const match = c.name.match(/\d+$/);
          return { channel: c, number: match ? parseInt(match[0]) : 0 };
        })
        .sort((a, b) => b.number - a.number);

      const nextNumber = overflowCategories[0] ? overflowCategories[0].number + 1 : 2;

      return guild.channels.create({
        name: `${baseName} ${nextNumber}`,
        type: ChannelType.GuildCategory,
        reason: "Archive category overflow",
      });
    },

    lockArchivedChannel: async (channel: TextChannel): Promise<void> => {
      try {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
          SendMessages: false,
          AddReactions: false,
          CreatePublicThreads: false,
          CreatePrivateThreads: false,
        });

        const closedPrefix = "🔒-";
        if (!channel.name.startsWith(closedPrefix)) {
          await channel.setName(`${closedPrefix}${channel.name}`).catch(() => {});
        }
      } catch (error) {
        console.error("Failed to lock archived channel:", error);
      }
    },
  },
} as const;
