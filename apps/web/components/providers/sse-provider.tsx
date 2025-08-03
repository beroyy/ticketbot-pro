"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSSEEventStore } from "@/stores/sse-events-store";

/**
 * SSE Provider Component
 *
 * Manages the global SSE connection lifecycle based on:
 * - Authentication state (no connection on login/register pages)
 * - Page visibility (disconnect when tab is hidden)
 * - Component mount/unmount
 */
export function SSEProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const connect = useSSEEventStore((state) => state.connect);
  const disconnect = useSSEEventStore((state) => state.disconnect);
  const connectionStatus = useSSEEventStore((state) => state.connectionStatus);

  useEffect(() => {
    const isAuthPage =
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname === "/" ||
      pathname.startsWith("/auth");

    if (isAuthPage) {
      console.log("[SSE Provider] Skipping connection on auth page:", pathname);
      return;
    }

    console.log("[SSE Provider] Initializing SSE connection for path:", pathname);
    connect();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("[SSE Provider] Page hidden, disconnecting SSE");
        disconnect();
      } else {
        console.log("[SSE Provider] Page visible, reconnecting SSE");
        connect();
      }
    };

    const handleOnline = () => {
      console.log("[SSE Provider] Network online, reconnecting SSE");
      connect();
    };

    const handleOffline = () => {
      console.log("[SSE Provider] Network offline, disconnecting SSE");
      disconnect();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      console.log("[SSE Provider] Cleaning up SSE connection");
      disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pathname, connect, disconnect]);

  if (process.env.NODE_ENV === "development") {
    useEffect(() => {
      console.log("[SSE Provider] Connection status:", connectionStatus);
    }, [connectionStatus]);
  }

  return <>{children}</>;
}
