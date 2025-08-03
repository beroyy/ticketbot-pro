import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import { toast } from "sonner";

export type SSEEventType =
  | { type: "guild-joined"; guildId: string; guildName: string; timestamp: number }
  | { type: "guild-left"; guildId: string; guildName: string; timestamp: number }
  | { type: "bot-configured"; guildId: string; timestamp: number }
  | {
      type: "ticket-created";
      ticketId: string;
      subject: string;
      guildId: string;
      timestamp: number;
    }
  | { type: "ticket-closed"; ticketId: string; guildId: string; timestamp: number }
  | { type: "settings-updated"; guildId: string; changes: Record<string, any>; timestamp: number };

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
function handleEventSideEffects(event: SSEEventType) {
  switch (event.type) {
    case "guild-joined":
      toast.success(`Bot installed in ${event.guildName}!`, {
        description: "The server list has been updated.",
        duration: 5000,
        id: `guild-joined-${event.guildId}`, // Prevent duplicate toasts
      });
      break;

    case "guild-left":
      toast.info(`Bot removed from ${event.guildName}`, {
        description: "The server is no longer available.",
        duration: 4000,
      });
      break;

    case "ticket-created":
      toast.info(`New ticket: ${event.subject}`, {
        description: "Click to view the ticket.",
        duration: 4000,
        action: {
          label: "View",
          onClick: () => {
            window.location.href = `/g/${event.guildId}/tickets/${event.ticketId}`;
          },
        },
      });
      break;

    case "ticket-closed":
      toast.info("Ticket closed", {
        description: "A ticket has been closed.",
        duration: 3000,
      });
      break;

    case "settings-updated":
      toast.success("Settings updated", {
        description: "Guild settings have been updated.",
        duration: 3000,
      });
      break;

    default:
      // Log unhandled events for debugging
      console.log("[SSE Store] Unhandled event type:", event);
  }
}

export const selectConnectionStatus = (state: SSEEventStore) => state.connectionStatus;
export const selectLastEvent = (state: SSEEventStore) => state.lastEvent;
export const selectEventHistory = (state: SSEEventStore) => state.eventHistory;
export const selectIsConnected = (state: SSEEventStore) => state.connectionStatus === "connected";
