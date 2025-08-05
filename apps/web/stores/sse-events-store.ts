import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import { toast } from "sonner";
// import { dialog } from "@/lib/dialog";

// Import the BotEvent type from webhooks
import type { BotEvent } from "@/lib/webhooks";

// SSE event types match the bot webhook events structure
export interface SSEEventType {
  type: BotEvent["type"];
  data: BotEvent["data"];
  timestamp: number;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface SSEEventStore {
  connectionStatus: ConnectionStatus;
  eventSource: EventSource | null;
  lastEvent: SSEEventType | null;
  eventHistory: SSEEventType[];
  reconnectAttempts: number;
  reconnectTimeout: NodeJS.Timeout | null;

  connect: () => void;
  disconnect: () => void;
  handleEvent: (event: SSEEventType) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  clearEventHistory: () => void;
}

export const useSSEEventStore = create<SSEEventStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        connectionStatus: "disconnected",
        eventSource: null,
        lastEvent: null,
        eventHistory: [],
        reconnectAttempts: 0,
        reconnectTimeout: null,

        connect: () => {
          const state = get();

          if (state.eventSource || state.connectionStatus === "connecting") {
            console.log("[SSE Store] Already connected or connecting");
            return;
          }

          console.log("[SSE Store] Connecting to SSE...");
          set((draft) => {
            draft.connectionStatus = "connecting";
          });

          try {
            const eventSource = new EventSource("/api/guilds/events", {
              withCredentials: true,
            });

            eventSource.onopen = () => {
              console.log("[SSE Store] Connection established");
              set((draft) => {
                draft.connectionStatus = "connected";
                draft.reconnectAttempts = 0;
                if (draft.reconnectTimeout) {
                  clearTimeout(draft.reconnectTimeout);
                  draft.reconnectTimeout = null;
                }
              });
            };

            eventSource.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                console.log("[SSE Store] Received event:", data);

                if (data.type === "connected") {
                  return;
                }

                get().handleEvent(data);
              } catch (error) {
                console.error("[SSE Store] Failed to parse event:", error);
              }
            };

            eventSource.onerror = () => {
              console.error("[SSE Store] Connection error");
              set((draft) => {
                draft.connectionStatus = "error";
                draft.eventSource = null;
              });

              eventSource.close();

              const attempts = get().reconnectAttempts;
              if (attempts < 5) {
                const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
                console.log(`[SSE Store] Reconnecting in ${delay}ms (attempt ${attempts + 1}/5)`);

                const timeout = setTimeout(() => {
                  set((draft) => {
                    draft.reconnectAttempts += 1;
                  });
                  get().connect();
                }, delay);

                set((draft) => {
                  draft.reconnectTimeout = timeout;
                });
              } else {
                console.error("[SSE Store] Max reconnection attempts reached");
                toast.error("Real-time updates disconnected", {
                  description: "Please refresh the page to reconnect.",
                });
              }
            };

            set((draft) => {
              draft.eventSource = eventSource;
            });
          } catch (error) {
            console.error("[SSE Store] Failed to create EventSource:", error);
            set((draft) => {
              draft.connectionStatus = "error";
            });
          }
        },

        disconnect: () => {
          console.log("[SSE Store] Disconnecting...");
          set((draft) => {
            if (draft.eventSource) {
              draft.eventSource.close();
              draft.eventSource = null;
            }
            if (draft.reconnectTimeout) {
              clearTimeout(draft.reconnectTimeout);
              draft.reconnectTimeout = null;
            }
            draft.connectionStatus = "disconnected";
            draft.reconnectAttempts = 0;
          });
        },

        handleEvent: (event: SSEEventType) => {
          set((draft) => {
            draft.lastEvent = event;
            draft.eventHistory.push(event);

            if (draft.eventHistory.length > 50) {
              draft.eventHistory.shift();
            }
          });

          handleEventSideEffects(event);
        },

        setConnectionStatus: (status: ConnectionStatus) => {
          set((draft) => {
            draft.connectionStatus = status;
          });
        },

        clearEventHistory: () => {
          set((draft) => {
            draft.eventHistory = [];
            draft.lastEvent = null;
          });
        },
      }))
    ),
    {
      name: "sse-events",
      serialize: {
        options: {
          replacer: (key: string, value: any) => {
            if (key === "eventSource" || key === "reconnectTimeout") {
              return undefined;
            }
            return value;
          },
        },
      },
    }
  )
);

// Side effects handler - kept outside store to avoid re-renders
async function handleEventSideEffects(event: SSEEventType) {
  switch (event.type) {
    case "guild.joined": {
      const data = event.data as import("@/lib/webhooks").GuildJoinedData;
      // Show a toast notification
      toast.success(`Bot installed in ${data.guildName}!`, {
        description: "The server list has been updated.",
        duration: 5000,
        id: `guild-joined-${data.guildId}`, // Prevent duplicate toasts
      });
      // Page refresh is handled by useGuildListRefresh hook
      break;
    }

    case "guild.left": {
      toast.info(`Bot removed from guild`, {
        description: "The server is no longer available.",
        duration: 4000,
      });
      // Page refresh is handled by useGuildListRefresh hook
      break;
    }

    case "guild.setup_complete": {
      toast.success("Bot setup completed!", {
        description: "Your bot is now ready to use.",
        duration: 5000,
      });
      break;
    }

    case "ticket.created": {
      const data = event.data as import("@/lib/webhooks").TicketCreatedData;
      toast.success(`New ticket #${data.ticketNumber} created`, {
        description: `Subject: ${data.subject}`,
        duration: 4000,
      });
      break;
    }

    case "ticket.updated": {
      const data = event.data as import("@/lib/webhooks").TicketUpdatedData;
      const changes = [];
      if (data.changes.subject) changes.push("subject");
      if (data.changes.priority) changes.push("priority");
      if (data.changes.tags) changes.push("tags");
      
      toast.info(`Ticket #${data.ticketNumber} updated`, {
        description: `Changed: ${changes.join(", ")}`,
        duration: 3000,
      });
      break;
    }

    case "ticket.deleted": {
      const data = event.data as import("@/lib/webhooks").TicketDeletedData;
      toast.warning(`Ticket #${data.ticketNumber} deleted`, {
        description: data.reason || "No reason provided",
        duration: 4000,
      });
      break;
    }

    case "ticket.message_sent": {
      const data = event.data as import("@/lib/webhooks").TicketMessageData;
      // Only show for staff messages in tickets
      if (data.messageType === "staff" || data.messageType === "customer") {
        toast.info(`New message in ticket #${data.ticketNumber}`, {
          description: `From: ${data.messageType}`,
          duration: 3000,
        });
      }
      break;
    }

    case "ticket.status_changed": {
      const data = event.data as import("@/lib/webhooks").TicketStatusData;
      toast.info(`Ticket #${data.ticketNumber} changed to ${data.newStatus}`, {
        duration: 3000,
      });
      break;
    }

    case "ticket.claimed": {
      const data = event.data as import("@/lib/webhooks").TicketStatusData;
      toast.info(`Ticket #${data.ticketNumber} claimed`, {
        duration: 3000,
      });
      break;
    }

    case "ticket.closed": {
      const data = event.data as import("@/lib/webhooks").TicketStatusData;
      toast.info(`Ticket #${data.ticketNumber} closed`, {
        duration: 3000,
      });
      break;
    }

    case "team.role_created":
    case "team.role_updated":
    case "team.role_deleted": {
      const data = event.data as import("@/lib/webhooks").TeamRoleData;
      const action = event.type.split(".")[1];
      toast.info(`Team role ${action}`, {
        description: `Role: ${data.roleName}`,
        duration: 3000,
      });
      break;
    }

    case "team.member_assigned":
    case "team.member_unassigned": {
      const data = event.data as import("@/lib/webhooks").TeamMemberData;
      const action = event.type === "team.member_assigned" ? "assigned to" : "unassigned from";
      toast.info(`${data.username} ${action} ${data.roleName}`, {
        duration: 3000,
      });
      break;
    }

    case "member.left": {
      const data = event.data as import("@/lib/webhooks").MemberLeftData;
      toast.info(`${data.username} left the server`, {
        duration: 3000,
      });
      break;
    }

    default:
      // Log unhandled events for debugging
      console.log("[SSE Store] Unhandled event type:", event);
  }
}

export const selectConnectionStatus = (state: SSEEventStore) => state.connectionStatus;
export const selectLastEvent = (state: SSEEventStore) => state.lastEvent;
export const selectEventHistory = (state: SSEEventStore) => state.eventHistory;
export const selectIsConnected = (state: SSEEventStore) => state.connectionStatus === "connected";
