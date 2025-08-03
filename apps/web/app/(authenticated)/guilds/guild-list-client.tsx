"use client";

import { useGuildListRefresh } from "@/hooks/use-sse-events";

export function GuildListClient() {
  // refresh on guild-joined/left events
  useGuildListRefresh();
  return null;
}
