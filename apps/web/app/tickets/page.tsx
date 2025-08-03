import { cookies } from "next/headers";
import { createAuthenticatedClient } from "@/lib/api-client";
import { TicketsDashboard } from "@/features/tickets/tickets-dashboard";
import { getServerSession } from "@/lib/auth-server";

type TicketsPageProps = {
  searchParams: Promise<{
    status?: string;
    search?: string;
    sort?: string;
    ticket?: string;
    guild?: string;
  }>;
};

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const api = createAuthenticatedClient(cookieHeader);

  const params = await searchParams;
  const status = params.status || "active";
  const search = params.search || "";
  const sort = params.sort || "createdAt";
  const selectedTicketId = params.ticket || null;

  try {
    const session = await getServerSession();
    if (!session) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Not Authenticated</h1>
            <p className="mt-2 text-gray-500">Please log in to view tickets</p>
          </div>
        </div>
      );
    }

    const userData = {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        discordUserId: session.user.discordUserId,
      }
    };

    const guildId = params.guild || "123456789012345678";

    const ticketsResponse = await api.tickets.$get({
      query: {
        guildId,
        status: status === "closed" ? "CLOSED" : undefined,
      },
    });

    if (!ticketsResponse.ok) {
      throw new Error("Failed to fetch tickets");
    }

    const tickets = (await ticketsResponse.json()) as any[];

    const filteredTickets =
      status === "active"
        ? tickets.filter((t) => t.status !== "closed")
        : tickets.filter((t) => t.status === "closed");

    return (
      <TicketsDashboard
        initialTickets={filteredTickets}
        user={userData.user}
        guildId={guildId}
        filters={{
          status,
          search,
          sort,
        }}
        selectedTicketId={selectedTicketId}
      />
    );
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Error Loading Tickets</h1>
          <p className="mt-2 text-gray-500">Please try refreshing the page</p>
        </div>
      </div>
    );
  }
}
