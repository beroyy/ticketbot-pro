import { cookies } from "next/headers";
import { createAuthenticatedClient } from "@/lib/api-client";
import { TicketsDashboard } from "@/features/tickets/tickets-dashboard";
import { getServerSession } from "@/lib/auth-server";
import RequirePermission from "@/components/guards/RequirePermission";

interface TicketsPageProps {
  params: {
    guildId: string;
  };
  searchParams: Promise<{
    status?: string;
    search?: string;
    sort?: string;
    ticket?: string;
  }>;
}

export default async function TicketsPage({ params, searchParams }: TicketsPageProps) {
  // Use guild ID from URL params
  const guildId = params.guildId;
  
  return (
    <RequirePermission 
      permission="TICKET_VIEW_ALL" 
      guildId={guildId}
      errorMessage="You don't have permission to view all tickets"
    >
      <TicketsPageContent params={params} searchParams={searchParams} />
    </RequirePermission>
  );
}

async function TicketsPageContent({ params, searchParams }: TicketsPageProps) {
  // Get cookies for authentication
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  
  // Create authenticated API client
  const api = createAuthenticatedClient(cookieHeader);
  
  // Parse search params
  const searchParamsData = await searchParams;
  const status = searchParamsData.status || "active";
  const search = searchParamsData.search || "";
  const sort = searchParamsData.sort || "createdAt";
  const selectedTicketId = searchParamsData.ticket || null;
  
  // Use guild ID from URL params
  const guildId = params.guildId;
  
  try {
    // Get session for user data
    const session = await getServerSession();
    if (!session) {
      throw new Error("No session");
    }
    
    // Fetch tickets with filters applied server-side
    const ticketsResponse = await api.tickets.$get({
      query: {
        guildId,
        status: status === "closed" ? "CLOSED" : undefined,
      }
    });
    
    if (!ticketsResponse.ok) {
      throw new Error("Failed to fetch tickets");
    }
    
    const tickets = await ticketsResponse.json() as any[];
    
    // The API returns tickets in the dashboard format, we need to handle the status filter
    const filteredTickets = status === "active" 
      ? tickets.filter((t) => t.status !== "closed")
      : tickets.filter((t) => t.status === "closed");
    
    return (
      <TicketsDashboard
        initialTickets={filteredTickets}
        user={session.user}
        guildId={guildId}
        filters={{
          status,
          search,
          sort
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
          <p className="text-gray-500 mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }
}