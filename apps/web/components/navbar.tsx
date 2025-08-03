import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "@/lib/auth-server";
import { getUserPermissions } from "@/lib/permissions-server";
import { PermissionFlags } from "@ticketsbot/core";
import { GuildSwitcher } from "@/components/guild-switcher";
import { UserMenu } from "@/components/user-menu";
import { getUserWithGuilds } from "@/lib/auth-server";
import { NavItems } from "@/components/nav-items";
import { MobileMenu } from "@/components/mobile-menu";

type NavItem = {
  href: string;
  label: string;
  permission?: keyof typeof PermissionFlags;
  permissions?: (keyof typeof PermissionFlags)[];
};

const navItems: NavItem[] = [
  { 
    href: "/dashboard", 
    label: "Dashboard", 
    permission: "GUILD_SETTINGS_VIEW" 
  },
  { 
    href: "/tickets", 
    label: "Tickets", 
    permission: "TICKET_VIEW_ALL" 
  },
  { 
    href: "/panels", 
    label: "Panels", 
    permission: "PANEL_CREATE" 
  },
  { 
    href: "/team", 
    label: "Team", 
    permissions: ["ROLE_CREATE", "ROLE_EDIT", "ROLE_ASSIGN"]
  },
  { 
    href: "/settings", 
    label: "Settings", 
    permission: "GUILD_SETTINGS_EDIT" 
  },
];

interface NavbarProps {
  guildId: string;
}

export async function Navbar({ guildId }: NavbarProps) {
  const session = await getServerSession();
  
  if (!session) {
    return null;
  }

  // Get user permissions for this guild
  const userPermissions = await getUserPermissions(guildId);
  
  // Get user with guilds for the guild switcher
  const userWithGuilds = await getUserWithGuilds(session.user.id);
  
  // Get current guild info for mobile menu
  const currentGuild = userWithGuilds?.guilds.find(g => g.id === guildId);
  
  // Filter navigation items based on permissions
  const visibleNavItems = navItems.filter((item) => {
    if (!item.permission && !item.permissions) return true;
    
    if (item.permission) {
      const requiredPermission = PermissionFlags[item.permission];
      return (userPermissions & requiredPermission) === requiredPermission;
    }
    
    if (item.permissions) {
      // Check if user has at least one of the permissions
      return item.permissions.some(perm => {
        const requiredPermission = PermissionFlags[perm];
        return (userPermissions & requiredPermission) === requiredPermission;
      });
    }
    
    return false;
  });

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center px-4 md:px-6">
        {/* Mobile Menu */}
        {currentGuild && (
          <MobileMenu
            items={visibleNavItems.map(item => ({
              href: item.href,
              label: item.label
            }))}
            guildId={guildId}
            guildName={currentGuild.name}
            guildIcon={currentGuild.icon}
          />
        )}

        {/* Logo */}
        <Link href={`/g/${guildId}/dashboard`} className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="TicketsBot"
            width={32}
            height={32}
            className="rounded-md"
          />
          <span className="hidden text-lg font-semibold md:block">TicketsBot</span>
        </Link>

        {/* Navigation Items */}
        <NavItems 
          items={visibleNavItems.map(item => ({
            href: item.href,
            label: item.label
          }))} 
          guildId={guildId} 
        />

        {/* Right side */}
        <div className="ml-auto flex items-center gap-4">
          {/* Guild Switcher - Hidden on mobile */}
          {userWithGuilds && (
            <div className="hidden md:block">
              <GuildSwitcher 
                currentGuildId={guildId}
                guilds={userWithGuilds.guilds}
              />
            </div>
          )}

          {/* User Menu */}
          <UserMenu 
            user={{
              name: session.user.name || "User",
              email: session.user.email || "",
              image: session.user.image,
            }}
          />
        </div>
      </div>
    </nav>
  );
}