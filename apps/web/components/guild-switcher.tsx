"use client";

import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { StableAvatar } from "@/components/stable-avatar";
import { setSelectedGuild } from "@/lib/guild-context";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Bot, Plus, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Guild {
  id: string;
  name: string;
  icon?: string | null;
  owner?: boolean;
  permissions?: string;
  botInstalled?: boolean;
}

interface GuildSwitcherProps {
  currentGuildId: string;
  guilds: Guild[];
}

export function GuildSwitcher({ currentGuildId, guilds }: GuildSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentGuild = guilds.find((g) => g.id === currentGuildId);

  if (!currentGuild) {
    return null;
  }

  const handleGuildSelect = async (guildId: string) => {
    if (guildId === currentGuildId) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await setSelectedGuild(guildId);
    } catch (error) {
      console.error("Failed to switch guild:", error);
      setIsLoading(false);
    }
  };

  // Build icon URL if icon hash exists
  const getIconUrl = (guild: Guild) => {
    if (!guild.icon) return null;
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
  };

  // Filter guilds based on search query
  const filteredGuilds = useMemo(() => {
    if (!searchQuery) return guilds;
    return guilds.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [guilds, searchQuery]);

  // Separate guilds by bot installation and ownership
  const guildsWithBot = filteredGuilds.filter((g) => g.botInstalled);
  const guildsWithoutBot = filteredGuilds.filter((g) => !g.botInstalled);

  const ownedGuildsWithBot = guildsWithBot.filter((g) => g.owner);
  const otherGuildsWithBot = guildsWithBot.filter((g) => !g.owner);

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setSearchQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1.5 pr-3 transition-colors hover:bg-gray-50",
            "focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            isLoading && "pointer-events-none opacity-50"
          )}
          disabled={isLoading}
        >
          <StableAvatar
            src={getIconUrl(currentGuild)}
            alt={currentGuild.name}
            size={28}
            fallbackClassName="bg-gray-600"
          />
          <span className="max-w-[120px] truncate text-sm font-medium text-gray-900">
            {currentGuild.name}
          </span>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          ) : (
            <ChevronsUpDown className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
        sideOffset={8}
      >
        {/* Search Input */}
        {guilds.length > 5 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        <div className="space-y-4">
          {ownedGuildsWithBot.length > 0 && (
            <div>
              <h3 className="mb-2 px-2 text-xs font-medium text-gray-500">Your Servers</h3>
              <div className="space-y-1">
                {ownedGuildsWithBot.map((guild) => (
                  <GuildItem
                    key={guild.id}
                    guild={guild}
                    isSelected={guild.id === currentGuildId}
                    onSelect={handleGuildSelect}
                    iconUrl={getIconUrl(guild)}
                  />
                ))}
              </div>
            </div>
          )}

          {otherGuildsWithBot.length > 0 && (
            <div>
              <h3 className="mb-2 px-2 text-xs font-medium text-gray-500">Other Servers</h3>
              <div className="space-y-1">
                {otherGuildsWithBot.map((guild) => (
                  <GuildItem
                    key={guild.id}
                    guild={guild}
                    isSelected={guild.id === currentGuildId}
                    onSelect={handleGuildSelect}
                    iconUrl={getIconUrl(guild)}
                  />
                ))}
              </div>
            </div>
          )}

          {guildsWithoutBot.length > 0 && (
            <div>
              <h3 className="mb-2 px-2 text-xs font-medium text-gray-500">Install Bot</h3>
              <div className="space-y-1">
                {guildsWithoutBot.map((guild) => (
                  <GuildItem
                    key={guild.id}
                    guild={guild}
                    isSelected={false}
                    onSelect={handleGuildSelect}
                    iconUrl={getIconUrl(guild)}
                  />
                ))}
              </div>
            </div>
          )}

          {guilds.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-gray-500">No servers found</p>
          )}

          {guilds.length > 0 && filteredGuilds.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-gray-500">
              No servers match "{searchQuery}"
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface GuildItemProps {
  guild: Guild;
  isSelected: boolean;
  onSelect: (id: string) => void;
  iconUrl: string | null;
}

function GuildItem({ guild, isSelected, onSelect, iconUrl }: GuildItemProps) {
  const handleInstallBot = (e: React.MouseEvent) => {
    e.stopPropagation();
    // const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "1397414095753318522";
    // const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=1099780064336&scope=bot+applications.commands&guild_id=${guild.id}`;

    // const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${
    //   process.env.NODE_ENV === "production" ? "1397412199869186090" : "1397414095753318522"
    // }`;

    const inviteUrl = "https://discord.com/oauth2/authorize?client_id=1397414095753318522";

    window.open(inviteUrl, "_blank");
  };

  return (
    <button
      onClick={() =>
        guild.botInstalled ? onSelect(guild.id) : handleInstallBot(new MouseEvent("click") as any)
      }
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
        isSelected ? "bg-gray-100" : "hover:bg-gray-50"
      )}
    >
      <div className="relative">
        <StableAvatar src={iconUrl} alt={guild.name} size={32} fallbackClassName="bg-gray-400" />
        {guild.botInstalled && (
          <div className="absolute -bottom-1 -right-1 rounded-full bg-green-500 p-0.5">
            <Bot className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium text-gray-900">{guild.name}</p>
        {!guild.botInstalled && <p className="text-xs text-gray-500">Bot not installed</p>}
      </div>
      <div className="flex items-center gap-2">
        {!guild.botInstalled ? (
          <Badge variant="outline" className="gap-1 text-xs">
            <Plus className="h-3 w-3" />
            Install
          </Badge>
        ) : (
          <>
            {isSelected && <Check className="h-4 w-4 text-blue-600" />}
            {guild.owner && (
              <Badge variant="secondary" className="text-xs">
                Owner
              </Badge>
            )}
          </>
        )}
      </div>
    </button>
  );
}
