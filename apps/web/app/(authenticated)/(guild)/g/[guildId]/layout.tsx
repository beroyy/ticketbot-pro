import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { validateGuildAccess } from "@/lib/guild-context";

/**
 * Guild Layout
 * Validates guild access and provides context to child pages
 */
export default async function GuildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { guildId: string };
}) {
  // Get session (parent layout ensures this exists)
  const session = await getServerSession();
  
  // This should never happen due to parent layout, but TypeScript needs the check
  if (!session) {
    redirect("/login");
  }
  
  // Validate guild access
  const hasAccess = await validateGuildAccess(
    session.user.discordUserId!,
    params.guildId
  );
  
  if (!hasAccess) {
    // User doesn't have access to this guild
    redirect("/guilds?error=no-access");
  }
  
  // User has access, render children with guild context
  return (
    <div className="min-h-screen bg-gray-50">
      {/* TODO: Add navigation header with guild switcher */}
      <main>{children}</main>
    </div>
  );
}