import { getServerSession } from "@/lib/auth-server";
import { Role } from "@ticketsbot/core/domains";
import { PermissionFlags, type PermissionFlag } from "@ticketsbot/core";

interface WithPermissionProps {
  children: React.ReactNode;
  permission: bigint | PermissionFlag;
  guildId: string;
  fallback?: React.ReactNode;
  requireAll?: boolean;
  permissions?: (bigint | PermissionFlag)[];
}

/**
 * Server component for conditional rendering based on permissions
 * Shows children if user has permission, fallback otherwise
 */
export default async function WithPermission({
  children,
  permission,
  guildId,
  fallback = null,
  requireAll = false,
  permissions = [],
}: WithPermissionProps) {
  // Get session
  const session = await getServerSession();
  
  if (!session?.user.discordUserId) {
    return <>{fallback}</>;
  }
  
  // Handle single permission or multiple permissions
  const permissionsToCheck = permissions.length > 0 ? permissions : [permission];
  
  // Convert permission flag names to bigints
  const permissionValues = permissionsToCheck.map(p => 
    typeof p === "string" ? PermissionFlags[p] : p
  );
  
  // Check permissions based on requireAll flag
  const hasPermission = requireAll
    ? await Role.hasAllPermissions(guildId, session.user.discordUserId, ...permissionValues)
    : await Role.hasAnyPermission(guildId, session.user.discordUserId, ...permissionValues);
  
  // Render based on permission check
  return <>{hasPermission ? children : fallback}</>;
}