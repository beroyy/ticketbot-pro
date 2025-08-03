import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, type AuthSession } from "@ticketsbot/core/auth";
import { User } from "@ticketsbot/core/domains";

/**
 * Server-side auth utilities for App Router
 * These functions run in Node.js with full database access
 */

/**
 * Get the current session from cookies
 * Uses better-auth's server-side session validation
 */
export async function getServerSession(): Promise<AuthSession | null> {
  try {
    // Get cookies from Next.js
    const cookieStore = await cookies();
    
    // Create a Request object with cookies for better-auth
    const request = new Request("http://localhost", {
      headers: {
        cookie: cookieStore.toString(),
      },
    });
    
    // Use better-auth's session validation
    const session = await getSession(request);
    
    return session;
  } catch (error) {
    console.error("Failed to get server session:", error);
    return null;
  }
}

/**
 * Require authentication or throw
 * Useful in server components that always need auth
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getServerSession();
  
  if (!session) {
    throw new Error("Unauthorized");
  }
  
  return session;
}

/**
 * Require authentication or redirect
 * Useful in pages/layouts that need auth
 */
export async function requireAuthOrRedirect(
  redirectTo: string = "/login"
): Promise<AuthSession> {
  const session = await getServerSession();
  
  if (!session) {
    redirect(redirectTo);
  }
  
  return session;
}

/**
 * Get user with cached Discord guilds
 * Includes guild data from DiscordUser cache
 */
export async function getUserWithGuilds(userId: string) {
  try {
    // Get user with Discord data
    const user = await User.getBetterAuthUser(userId);
    if (!user?.discordUserId) {
      return null;
    }
    
    // Get Discord user with cached guilds
    const discordUser = await User.getDiscordUser(user.discordUserId);
    if (!discordUser) {
      return null;
    }
    
    // Parse guilds from JSON field
    const guildsData = discordUser.guilds as { data?: any[] } | null;
    
    return {
      ...user,
      discordUser,
      guilds: guildsData?.data || [],
    };
  } catch (error) {
    console.error("Failed to get user with guilds:", error);
    return null;
  }
}

/**
 * Check if session is valid
 * Simple boolean check without throwing
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session;
}