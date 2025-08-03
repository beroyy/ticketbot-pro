"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ticketQueries } from "./queries";
import { TicketsList } from "./tickets-list";
import { TicketsControls } from "./tickets-controls";
import { TicketDetail } from "./ticket-detail";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";

type TicketsDashboardProps = {
  initialTickets: any[];
  user: any;
  guildId: string;
  filters: {
    status: string;
    search: string;
    sort: string;
  };
  selectedTicketId: string | null;
};

export function TicketsDashboard({
  initialTickets,
  user: _user,
  guildId,
  filters,
  selectedTicketId: initialSelectedId,
}: TicketsDashboardProps) {
  const router = useRouter();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialSelectedId);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    data: tickets = initialTickets,
    isLoading,
    error,
  } = useQuery({
    ...ticketQueries.list(guildId, filters),
    initialData: initialTickets,
  });

  const selectedTicket = tickets.find((t: any) => t.id === selectedTicketId);

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const params = new URLSearchParams();
    const merged = { ...filters, ...newFilters };

    if (merged.status !== "active") params.set("status", merged.status);
    if (merged.search) params.set("search", merged.search);
    if (merged.sort !== "createdAt") params.set("sort", merged.sort);
    if (selectedTicketId) params.set("ticket", selectedTicketId);

    router.push(`/tickets?${params.toString()}`);
  };

  const handleTabChange = (value: string) => {
    updateFilters({ status: value });
  };

  const handleTicketSelect = (ticketId: string | null) => {
    setSelectedTicketId(ticketId);

    const params = new URLSearchParams(window.location.search);
    if (ticketId) {
      params.set("ticket", ticketId);
    } else {
      params.delete("ticket");
    }
    router.push(`/tickets?${params.toString()}`);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div
        className={`flex flex-col border-r bg-white ${
          isCollapsed ? "w-16" : "w-96"
        } ${selectedTicket ? "hidden md:flex" : "flex-1 md:flex-initial"} transition-all duration-200`}
      >
        {!isCollapsed && (
          <div className="border-b p-6">
            {!selectedTicket && (
              <div className="mb-4">
                <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
                <p className="mt-1 text-sm text-gray-500">
                  See all the ticket history, status, progress and chat
                </p>
              </div>
            )}

            <Tabs value={filters.status} onValueChange={handleTabChange} className="w-full">
              <TabsList className={`grid grid-cols-2 ${selectedTicket ? "w-full" : "w-48"}`}>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-4">
              <TicketsControls
                filters={filters}
                onFiltersChange={updateFilters}
                isCompact={!!selectedTicket}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <TicketsList
            tickets={tickets}
            selectedTicketId={selectedTicketId}
            onTicketSelect={handleTicketSelect}
            isLoading={isLoading}
            error={error}
            isCompact={!!selectedTicket}
            isCollapsed={isCollapsed}
          />
        </div>
      </div>

      {selectedTicket && (
        <div className="flex flex-1">
          <TicketDetail
            ticket={selectedTicket}
            guildId={guildId}
            onClose={() => handleTicketSelect(null)}
            onCollapseToggle={() => setIsCollapsed(!isCollapsed)}
            isLeftPanelCollapsed={isCollapsed}
          />
        </div>
      )}

      {!selectedTicket && !isCollapsed && (
        <div className="hidden flex-1 items-center justify-center md:flex">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No ticket selected</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by selecting a ticket from the list.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
