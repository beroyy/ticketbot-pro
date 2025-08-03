import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { validateGuildAccess, getGuildWithAccess } from "@/lib/guild-context";
import { Navbar } from "@/components/navbar";

/**
 * Guild Layout
 * Validates guild access and provides context to child pages
 * Fetches user permissions for the guild
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
  
  // Await params before accessing properties
  const { guildId } = await params;
  
  // Validate guild access
  const hasAccess = await validateGuildAccess(
    session.user.discordUserId!,
    guildId
  );
  
  if (!hasAccess) {
    // User doesn't have access to this guild
    redirect("/guilds?error=no-access");
  }
  
  // Get guild details
  const guild = await getGuildWithAccess(session.user.discordUserId!, guildId);
  
  if (!guild) {
    // This shouldn't happen if validateGuildAccess passed, but handle it
    redirect("/guilds?error=guild-not-found");
  }
  
  // User has access, render children with guild context
  // Each page/component will fetch permissions as needed for server-side checks
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar guildId={guildId} />
      <main>{children}</main>
    </div>
  );
}