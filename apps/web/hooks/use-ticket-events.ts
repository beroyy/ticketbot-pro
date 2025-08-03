import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSSEEvent } from "./use-sse-events";

/**
 * Hook to subscribe to ticket list events (created, deleted)
 * Automatically invalidates the tickets list query when events occur
 */
export function useTicketListEvents(
  guildId: string,
  options?: {
    onTicketCreated?: (ticketId: number) => void;
    onTicketDeleted?: (ticketId: number) => void;
  }
) {
  const queryClient = useQueryClient();

  // Subscribe to ticket created events
  useSSEEvent("ticket.created", (event) => {
    if (event.type === "ticket.created") {
      const data = event.data as import("@/lib/webhooks").TicketCreatedData;
      
      // Only process events for the current guild
      if (data.guildId === guildId) {
        console.log(`[SSE Hook] Ticket created: #${data.ticketNumber}`);
        
        // Invalidate the tickets list query to refetch
        queryClient.invalidateQueries({
          queryKey: ["tickets", "list", guildId],
          exact: false, // Match all queries starting with this key (includes params)
        });

        // Call optional callback
        options?.onTicketCreated?.(data.ticketId);
      }
    }
  });

  // Subscribe to ticket deleted events
  useSSEEvent("ticket.deleted", (event) => {
    if (event.type === "ticket.deleted") {
      const data = event.data as import("@/lib/webhooks").TicketDeletedData;
      
      // Only process events for the current guild
      if (data.guildId === guildId) {
        console.log(`[SSE Hook] Ticket deleted: #${data.ticketNumber}`);
        
        // Invalidate the tickets list query to refetch
        queryClient.invalidateQueries({
          queryKey: ["tickets", "list", guildId],
          exact: false, // Match all queries starting with this key (includes params)
        });

        // Call optional callback
        options?.onTicketDeleted?.(data.ticketId);
      }
    }
  });
}

/**
 * Hook to subscribe to specific ticket events (updated, status changed, etc.)
 */
export function useTicketDetailEvents(
  ticketId: string | number,
  guildId: string,
  options?: {
    onTicketUpdated?: (changes: any) => void;
    onTicketDeleted?: () => void;
    onTicketStatusChanged?: (newStatus: string) => void;
    onNewMessage?: () => void;
  }
) {
  const queryClient = useQueryClient();
  const ticketIdNum = typeof ticketId === 'string' ? parseInt(ticketId) : ticketId;

  // Subscribe to ticket updated events
  useSSEEvent("ticket.updated", (event) => {
    if (event.type === "ticket.updated") {
      const data = event.data as import("@/lib/webhooks").TicketUpdatedData;
      
      if (data.ticketId === ticketIdNum && data.guildId === guildId) {
        console.log(`[SSE Hook] Ticket #${data.ticketNumber} updated`);
        
        // Invalidate ticket detail query
        queryClient.invalidateQueries({
          queryKey: ["tickets", "detail", ticketId.toString()],
        });

        // Also invalidate the list to update the item there
        queryClient.invalidateQueries({
          queryKey: ["tickets", "list", guildId],
          exact: false, // Match all queries starting with this key (includes params)
        });

        options?.onTicketUpdated?.(data.changes);
      }
    }
  });

  // Subscribe to ticket deleted events
  useSSEEvent("ticket.deleted", (event) => {
    if (event.type === "ticket.deleted") {
      const data = event.data as import("@/lib/webhooks").TicketDeletedData;
      
      if (data.ticketId === ticketIdNum && data.guildId === guildId) {
        console.log(`[SSE Hook] Current ticket deleted`);
        options?.onTicketDeleted?.();
      }
    }
  });

  // Subscribe to status change events
  useSSEEvent("ticket.status_changed", (event) => {
    if (event.type === "ticket.status_changed") {
      const data = event.data as import("@/lib/webhooks").TicketStatusData;
      
      if (data.ticketId === ticketIdNum && data.guildId === guildId) {
        console.log(`[SSE Hook] Ticket status changed to ${data.newStatus}`);
        
        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: ["tickets", "detail", ticketId.toString()],
        });
        queryClient.invalidateQueries({
          queryKey: ["tickets", "list", guildId],
          exact: false, // Match all queries starting with this key (includes params)
        });

        options?.onTicketStatusChanged?.(data.newStatus);
      }
    }
  });

  // Subscribe to message events
  useSSEEvent("ticket.message_sent", (event) => {
    if (event.type === "ticket.message_sent") {
      const data = event.data as import("@/lib/webhooks").TicketMessageData;
      
      if (data.ticketId === ticketIdNum && data.guildId === guildId) {
        console.log(`[SSE Hook] New message in ticket`);
        
        // Invalidate messages query
        queryClient.invalidateQueries({
          queryKey: ["tickets", ticketId.toString(), "messages"],
        });

        // Update the last message timestamp in the list
        queryClient.invalidateQueries({
          queryKey: ["tickets", "list", guildId],
          exact: false, // Match all queries starting with this key (includes params)
        });

        options?.onNewMessage?.();
      }
    }
  });

  // Subscribe to ticket closed events
  useSSEEvent("ticket.closed", (event) => {
    if (event.type === "ticket.closed") {
      const data = event.data as import("@/lib/webhooks").TicketStatusData;
      
      if (data.ticketId === ticketIdNum && data.guildId === guildId) {
        console.log(`[SSE Hook] Ticket closed`);
        
        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: ["tickets", "detail", ticketId.toString()],
        });
        queryClient.invalidateQueries({
          queryKey: ["tickets", "list", guildId],
          exact: false, // Match all queries starting with this key (includes params)
        });

        options?.onTicketStatusChanged?.("closed");
      }
    }
  });
}

/**
 * Hook to ensure SSE connection is active
 * Useful for pages that need real-time updates
 */
export function useEnsureSSEConnection() {
  useEffect(() => {
    // Import store dynamically to avoid issues
    import("@/stores/sse-events-store").then(({ useSSEEventStore }) => {
      const { connect, connectionStatus } = useSSEEventStore.getState();
      
      if (connectionStatus === "disconnected") {
        console.log("[SSE Hook] Ensuring SSE connection...");
        connect();
      }
    });
  }, []);
}