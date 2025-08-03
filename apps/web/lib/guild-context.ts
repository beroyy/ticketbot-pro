"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role, findById } from "@ticketsbot/core/domains";
import { parseDiscordId } from "@ticketsbot/core";

/**
 * Guild context management for App Router
 * Handles guild selection, validation, and persistence
 */

const GUILD_COOKIE_NAME = "selectedGuild";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Validate user has access to a guild
 * Checks both bot installation and user permissions
 */
export async function validateGuildAccess(
  userId: string,
  guildId: string
): Promise<boolean> {
  try {
    // Parse and validate guild ID
    const parsedGuildId = parseDiscordId(guildId);
    if (!parsedGuildId) {
      return false;
    }
    
    // Check if guild exists and bot is installed
    const guild = await findById(parsedGuildId);
    if (!guild?.botInstalled) {
      return false;
    }
    
    // Check if user has any permissions in the guild
    const permissions = await Role.getUserPermissions(parsedGuildId, userId);
    return permissions !== null && permissions !== 0n;
  } catch (error) {
    console.error("Failed to validate guild access:", error);
    return false;
  }
}

/**
 * Check if bot is installed in a guild
 */
export async function checkBotInstalled(guildId: string): Promise<boolean> {
  try {
    const parsedGuildId = parseDiscordId(guildId);
    if (!parsedGuildId) {
      return false;
    }
    
    const guild = await findById(parsedGuildId);
    return guild?.botInstalled === true;
  } catch (error) {
    console.error("Failed to check bot installation:", error);
    return false;
  }
}

/**
 * Server action to set selected guild
 * Updates cookie and redirects to guild dashboard
 */
export async function setSelectedGuild(guildId: string) {
  const cookieStore = await cookies();
  
  // Validate guild ID
  const parsedGuildId = parseDiscordId(guildId);
  if (!parsedGuildId) {
    throw new Error("Invalid guild ID");
  }
  
  // Set cookie
  cookieStore.set(GUILD_COOKIE_NAME, parsedGuildId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
  });
  
  // Redirect to guild dashboard
  redirect(`/g/${parsedGuildId}/dashboard`);
}

/**
 * Get selected guild from cookie
 * Returns null if no guild selected
 */
export async function getSelectedGuild(): Promise<string | null> {
  const cookieStore = await cookies();
  const guildId = cookieStore.get(GUILD_COOKIE_NAME)?.value;
  
  if (!guildId) {
    return null;
  }
  
  // Validate it's a valid Discord ID
  const parsed = parseDiscordId(guildId);
  return parsed;
}

/**
 * Clear selected guild cookie
 */
export async function clearSelectedGuild() {
  const cookieStore = await cookies();
  cookieStore.delete(GUILD_COOKIE_NAME);
}

/**
 * Get guild details with user access check
 * Returns guild data if user has access, null otherwise
 */
export async function getGuildWithAccess(
  userId: string,
  guildId: string
) {
  try {
    const parsedGuildId = parseDiscordId(guildId);
    if (!parsedGuildId) {
      return null;
    }
    
    // Check access first
    const hasAccess = await validateGuildAccess(userId, parsedGuildId);
    if (!hasAccess) {
      return null;
    }
    
    // Get guild details
    const guild = await findById(parsedGuildId);
    return guild;
  } catch (error) {
    console.error("Failed to get guild with access:", error);
    return null;
  }
}