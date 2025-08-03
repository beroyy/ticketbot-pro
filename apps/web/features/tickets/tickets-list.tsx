"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type TicketsListProps = {
  tickets: any[];
  selectedTicketId: string | null;
  onTicketSelect: (ticketId: string) => void;
  isLoading: boolean;
  error: any;
  isCompact: boolean;
  isCollapsed: boolean;
};

export function TicketsList({
  tickets,
  selectedTicketId,
  onTicketSelect,
  isLoading,
  error,
  isCompact,
  isCollapsed,
}: TicketsListProps) {
  if (isCollapsed) {
    return (
      <div className="p-2">
        {tickets.slice(0, 5).map((ticket) => (
          <button
            key={ticket.id}
            onClick={() => onTicketSelect(ticket.id)}
            className={`mb-2 flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
              selectedTicketId === ticket.id
                ? "bg-blue-100 text-blue-600"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
            title={ticket.title}
          >
            <span className="text-xs font-medium">{ticket.id.slice(-4)}</span>
          </button>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="mb-3">
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-red-600">Error loading tickets</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-gray-500">No tickets found</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {tickets.map((ticket) => (
        <button
          key={ticket.id}
          onClick={() => onTicketSelect(ticket.id)}
          className={`w-full p-4 text-left transition-colors hover:bg-gray-50 ${
            selectedTicketId === ticket.id ? "bg-blue-50" : ""
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className={`truncate font-medium ${isCompact ? "text-sm" : ""}`}>
                  {ticket.subject || ticket.type || "Support Ticket"}
                </h3>
                <span className="text-xs text-gray-500">{ticket.id}</span>
              </div>

              <p className={`line-clamp-2 text-gray-600 ${isCompact ? "text-xs" : "text-sm"}`}>
                {ticket.opener} • {ticket.type}
              </p>

              <div className="mt-2 flex items-center gap-3">
                <Badge variant={getStatusVariant(ticket.status)} className="text-xs">
                  {formatStatus(ticket.status)}
                </Badge>

                <span className="text-xs text-gray-500">{ticket.createdAt}</span>

                {ticket.assignee && (
                  <span className="text-xs text-gray-600">Assigned to {ticket.assignee}</span>
                )}
              </div>
            </div>

            {ticket.priority && (
              <div className="ml-2">
                <Badge variant={getPriorityVariant(ticket.priority)} className="text-xs">
                  {ticket.priority}
                </Badge>
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case "open":
      return "default";
    case "in_progress":
      return "secondary";
    case "closed":
      return "outline";
    default:
      return "default";
  }
}

function getPriorityVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
  switch (priority.toLowerCase()) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "default";
  }
}

function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "open":
      return "Open";
    case "in_progress":
      return "In Progress";
    case "closed":
      return "Closed";
    case "waiting":
      return "Waiting";
    default:
      return status;
  }
}
