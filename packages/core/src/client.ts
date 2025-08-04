/**
 * Client-safe exports from @ticketsbot/core
 * This file only exports utilities and schemas that are safe to use in browser environments
 */

// Export common schemas only (not domain-specific ones that might include server code)
export {
  // Schema exports
  DiscordIdSchema,
  DiscordUserIdSchema,
  DiscordGuildIdSchema,
  DiscordChannelIdSchema,
  CuidSchema,
  TimestampSchema,
  TicketStatusSchema,
  UserRoleSchema,
  PanelTypeSchema,
  FormFieldTypeSchema,
  ActionTypeSchema,
  ColorHexSchema,
  HexColorSchema,
  EmojiSchema,
  UrlSchema,
  JsonSchema,
  PositiveIntSchema,
  NonNegativeIntSchema,
  BigIntStringSchema,
  DiscordUsernameSchema,
  DiscordDiscriminatorSchema,
  PrioritySchema,
  JsonMetadataSchema,
  PaginationSchema,
  DateRangeSchema,
  // Type exports
  type DiscordId,
  type TicketStatus,
  type UserRole,
  type PanelType,
  type FormFieldType,
  type ActionType,
  type Priority,
} from "./schemas/common";

// Export permissions - avoiding duplicate exports by importing from permissions.ts
// which already re-exports from permissions-constants
import { PermissionUtils } from "./utils/permissions";
export { PermissionUtils };

// Export permission constants directly from permissions-constants
export {
  PermissionFlags,
  type PermissionFlag,
  type PermissionValue,
  ALL_PERMISSIONS,
  PermissionCategories,
  DefaultRolePermissions,
} from "./schemas/permissions-constants";

// Export client-safe utilities
export {
  // Interfaces
  type BotConfig,
  type TicketEmbedOptions,
  // Functions
  formatDuration,
  parseDiscordId,
  formatDiscordId,
  createTicketChannelName,
  createTicketThreadName,
} from "./utils";

export { DiscordIdSchemaV4, parseDiscordIdV4, validateDiscordIdV4 } from "./utils/discord-id";

// Re-export Zod for convenience
export { z } from "zod";
