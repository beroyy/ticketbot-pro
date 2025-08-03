import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { Role } from "@ticketsbot/core/domains";
import { PermissionFlags, type PermissionFlag } from "@ticketsbot/core";

interface RequirePermissionProps {
  children: React.ReactNode;
  permission: bigint | PermissionFlag;
  guildId: string;
  redirectTo?: string;
  errorMessage?: string;
}

/**
 * Server component that guards content based on permissions
 * Redirects if user lacks required permission
 */
export default async function RequirePermission({
  children,
  permission,
  guildId,
  redirectTo,
  errorMessage = "You don't have permission to access this page",
}: RequirePermissionProps) {
  // Get session
  const session = await getServerSession();
  
  if (!session?.user.discordUserId) {
    redirect("/login");
  }
  
  // Convert permission flag name to bigint if needed
  const permissionValue = typeof permission === "string" 
    ? PermissionFlags[permission]
    : permission;
  
  // Check if user has the required permission
  const hasPermission = await Role.hasPermission(
    guildId,
    session.user.discordUserId,
    permissionValue
  );
  
  if (!hasPermission) {
    // Redirect with error message
    const redirectUrl = redirectTo || `/g/${guildId}/dashboard`;
    const params = new URLSearchParams({ 
      error: "permission-denied",
      message: errorMessage 
    });
    redirect(`${redirectUrl}?${params.toString()}`);
  }
  
  // User has permission, render children
  return <>{children}</>;
}