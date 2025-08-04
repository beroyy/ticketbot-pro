"use client";

import { useGuildListRefresh } from "@/hooks/use-sse-events";

type GuildListClientProps = {
  enableSSE?: boolean;
};

export function GuildListClient({ enableSSE = true }: GuildListClientProps) {
  // refresh on guild-joined/left events only if SSE is enabled
  if (enableSSE) {
    useGuildListRefresh();
  }
  return null;
}
