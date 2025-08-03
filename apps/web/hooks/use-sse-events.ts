import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSSEEventStore, type SSEEventType } from "@/stores/sse-events-store";

/**
 * Hook to subscribe to specific SSE event types
 *
 * @param eventType - The type of event to listen for
 * @param callback - Function to call when the event occurs
 *
 * @example
 * useSSEEvent('guild.joined', (event) => {
 *   console.log(`Guild ${event.data.guildName} joined!`);
 * });
 */
export function useSSEEvent<T extends SSEEventType["type"]>(
  eventType: T,
  callback: (event: SSEEventType) => void
) {
  // Use ref to avoid re-subscribing on every render
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsubscribe = useSSEEventStore.subscribe(
      (state) => state.lastEvent,
      (event) => {
        if (event && event.type === eventType) {
          callbackRef.current(event);
        }
      }
    );

    return unsubscribe;
  }, [eventType]);
}

/**
 * Hook to get the current SSE connection status
 */
export function useSSEConnectionStatus() {
  return useSSEEventStore((state) => state.connectionStatus);
}

/**
 * Hook to check if SSE is connected
 */
export function useIsSSEConnected() {
  return useSSEEventStore((state) => state.connectionStatus === "connected");
}

/**
 * Hook to get the event history
 */
export function useSSEEventHistory() {
  return useSSEEventStore((state) => state.eventHistory);
}

/**
 * Hook to subscribe to events for a specific guild
 *
 * @param guildId - The guild ID to filter events for
 * @param callback - Function to call when a guild event occurs
 */
export function useGuildSSEEvents(
  guildId: string | null,
  callback?: (event: SSEEventType) => void
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!guildId) return;

    const unsubscribe = useSSEEventStore.subscribe(
      (state) => state.lastEvent,
      (event) => {
        if (!event) return;

        // Check if event has guildId property and matches
        if ("guildId" in event && event.guildId === guildId) {
          console.log(`[SSE Hook] Guild event for ${guildId}:`, event);
          callbackRef.current?.(event);
        }
      }
    );

    return unsubscribe;
  }, [guildId]);
}

/**
 * Hook for guild pages that need to refresh on guild-joined events
 */
export function useGuildListRefresh() {
  const router = useRouter();

  useSSEEvent("guild.joined", (event) => {
    if (event.type === "guild.joined") {
      const data = event.data as import("@/lib/webhooks").GuildJoinedData;
      console.log(`[SSE Hook] Guild joined: ${data.guildName}, refreshing router`);
      router.refresh();
    }
  });

  useSSEEvent("guild.left", () => {
    console.log(`[SSE Hook] Guild left, refreshing router`);
    router.refresh();
  });
}

/**
 * Hook to manually control SSE connection
 */
export function useSSEConnection() {
  const connect = useSSEEventStore((state) => state.connect);
  const disconnect = useSSEEventStore((state) => state.disconnect);
  const connectionStatus = useSSEEventStore((state) => state.connectionStatus);

  return {
    connect,
    disconnect,
    connectionStatus,
    isConnected: connectionStatus === "connected",
  };
}

/**
 * Debug hook to log all SSE events
 */
export function useSSEDebugger(enabled = false) {
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = useSSEEventStore.subscribe(
      (state) => state.lastEvent,
      (event) => {
        if (event) {
          console.log("[SSE Debug]", new Date().toISOString(), event);
        }
      }
    );

    return unsubscribe;
  }, [enabled]);
}
