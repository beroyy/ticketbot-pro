import { redirect } from "next/navigation";
import { getServerSession } from "./auth-server";
import { Role } from "@ticketsbot/core/domains";
import { PermissionFlags, PermissionUtils, type PermissionFlag } from "@ticketsbot/core";

/**
 * Server-side permission checking utilities
 * These functions handle permission validation with proper redirects
 */

/**
 * Check if current user has a specific permission
 * Redirects if permission is missing
 */
export async function checkPermission(
  guildId: string,
  permission: bigint | PermissionFlag,
  redirectTo?: string
) {
  const session = await getServerSession();
  
  if (!session?.user.discordUserId) {
    redirect("/login");
  }
  
  const permissionValue = typeof permission === "string" 
    ? PermissionFlags[permission]
    : permission;
  
  const hasPermission = await Role.hasPermission(
    guildId,
    session.user.discordUserId,
    permissionValue
  );
  
  if (!hasPermission) {
    const redirectUrl = redirectTo || `/g/${guildId}/dashboard`;
    const permissionName = typeof permission === "string" 
      ? permission 
      : PermissionUtils.getPermissionNames(permissionValue)[0] || "Required permission";
    
    const params = new URLSearchParams({ 
      error: "permission-denied",
      permission: permissionName
    });
    redirect(`${redirectUrl}?${params.toString()}`);
  }
}

/**
 * Check if current user has any of the specified permissions
 * Redirects if none of the permissions are present
 */
export async function checkAnyPermission(
  guildId: string,
  permissions: (bigint | PermissionFlag)[],
  redirectTo?: string
) {
  const session = await getServerSession();
  
  if (!session?.user.discordUserId) {
    redirect("/login");
  }
  
  const permissionValues = permissions.map(p => 
    typeof p === "string" ? PermissionFlags[p] : p
  );
  
  const hasPermission = await Role.hasAnyPermission(
    guildId,
    session.user.discordUserId,
    ...permissionValues
  );
  
  if (!hasPermission) {
    const redirectUrl = redirectTo || `/g/${guildId}/dashboard`;
    const params = new URLSearchParams({ 
      error: "permission-denied",
      message: "You need at least one of the required permissions"
    });
    redirect(`${redirectUrl}?${params.toString()}`);
  }
}

/**
 * Check if current user has all of the specified permissions
 * Redirects if any permission is missing
 */
export async function checkAllPermissions(
  guildId: string,
  permissions: (bigint | PermissionFlag)[],
  redirectTo?: string
) {
  const session = await getServerSession();
  
  if (!session?.user.discordUserId) {
    redirect("/login");
  }
  
  const permissionValues = permissions.map(p => 
    typeof p === "string" ? PermissionFlags[p] : p
  );
  
  const hasPermission = await Role.hasAllPermissions(
    guildId,
    session.user.discordUserId,
    ...permissionValues
  );
  
  if (!hasPermission) {
    const redirectUrl = redirectTo || `/g/${guildId}/dashboard`;
    const params = new URLSearchParams({ 
      error: "permission-denied",
      message: "You need all of the required permissions"
    });
    redirect(`${redirectUrl}?${params.toString()}`);
  }
}

/**
 * Get human-readable permission names for the current user
 * Returns empty array if not authenticated
 */
export async function getUserPermissionNames(guildId: string): Promise<string[]> {
  const session = await getServerSession();
  
  if (!session?.user.discordUserId) {
    return [];
  }
  
  try {
    return await Role.getUserPermissionNames(guildId, session.user.discordUserId);
  } catch (error) {
    console.error("Failed to get user permission names:", error);
    return [];
  }
}

/**
 * Get raw permission value for the current user
 * Returns 0n if not authenticated
 */
export async function getUserPermissions(guildId: string): Promise<bigint> {
  const session = await getServerSession();
  
  if (!session?.user.discordUserId) {
    return 0n;
  }
  
  try {
    return await Role.getUserPermissions(guildId, session.user.discordUserId);
  } catch (error) {
    console.error("Failed to get user permissions:", error);
    return 0n;
  }
}