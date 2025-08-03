import { api } from "@/lib/api-client";

export const ticketQueries = {
  list: (guildId: string, params: { status?: string; search?: string; sort?: string }) => ({
    queryKey: ["tickets", "list", guildId, params],
    queryFn: async () => {
      const res = await api.tickets.$get({
        query: {
          guildId,
          status: params.status === "closed" ? "CLOSED" : undefined,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      const data = (await res.json()) as any[];

      let filtered = [...data];

      if (params.status === "active") {
        filtered = filtered.filter((t) => t.status !== "closed");
      } else if (params.status === "closed") {
        filtered = filtered.filter((t) => t.status === "closed");
      }

      if (params.search) {
        const searchLower = params.search.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.subject?.toLowerCase().includes(searchLower) ||
            t.type?.toLowerCase().includes(searchLower) ||
            t.opener?.toLowerCase().includes(searchLower) ||
            t.id?.toLowerCase().includes(searchLower)
        );
      }

      if (params.sort) {
        filtered.sort((a, b) => {
          switch (params.sort) {
            case "updatedAt":
              return new Date(b.lastMessage).getTime() - new Date(a.lastMessage).getTime();
            case "status":
              return a.status.localeCompare(b.status);
            case "priority": {
              const priorityOrder = { high: 0, medium: 1, low: 2 };
              return (
                priorityOrder[a.priority as keyof typeof priorityOrder] -
                priorityOrder[b.priority as keyof typeof priorityOrder]
              );
            }
            default:
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
        });
      }

      return filtered;
    },
  }),

  detail: (ticketId: string) => ({
    queryKey: ["tickets", "detail", ticketId],
    queryFn: async () => {
      const res = await api.tickets[":id"].$get({
        param: { id: ticketId },
      });
      if (!res.ok) throw new Error("Failed to fetch ticket");
      return res.json();
    },
  }),

  messages: (ticketId: string, guildId: string) => ({
    queryKey: ["tickets", ticketId, "messages"],
    queryFn: async () => {
      const res = await api.tickets[":id"].messages.$get({
        param: { id: ticketId },
        query: { guildId },
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    srefetchInterval: 5000,
  }),

  activity: (ticketId: string, guildId: string) => ({
    queryKey: ["tickets", ticketId, "activity"],
    queryFn: async () => {
      const res = await api.tickets[":id"].activity.$get({
        param: { id: ticketId },
        query: { guildId },
      });
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
  }),
};
