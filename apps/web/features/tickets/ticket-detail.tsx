"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  MessageSquare,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ticketQueries } from "./queries";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

type TicketDetailProps = {
  ticket: any;
  guildId: string;
  onClose: () => void;
  onCollapseToggle: () => void;
  isLeftPanelCollapsed: boolean;
};

export function TicketDetail({
  ticket,
  guildId,
  onClose,
  onCollapseToggle,
  isLeftPanelCollapsed,
}: TicketDetailProps) {
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    ...ticketQueries.messages(ticket.id.replace("#", ""), guildId),
    enabled: !!ticket.id,
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await api.tickets[":id"].claim.$post({
        param: { id: ticket.id.replace("#", "") },
      });
      if (!res.ok) throw new Error("Failed to claim ticket");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket claimed");
    },
    onError: () => {
      toast.error("Failed to claim ticket");
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.tickets[":id"].close.$post({
        param: { id: ticket.id.replace("#", "") },
      });
      if (!res.ok) throw new Error("Failed to close ticket");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket closed");
      onClose();
    },
    onError: () => {
      toast.error("Failed to close ticket");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.tickets[":id"].messages.$post({
        param: { id: ticket.id.replace("#", "") },
        json: { content },
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({
        queryKey: ["tickets", ticket.id.replace("#", ""), "messages"],
      });
    },
    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onCollapseToggle} className="md:flex">
            {isLeftPanelCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>

          <div>
            <h2 className="text-lg font-semibold">
              {ticket.subject || ticket.type || "Support Ticket"}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{ticket.id}</span>
              <span>•</span>
              <span>{ticket.createdAt}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(ticket.status)}>{formatStatus(ticket.status)}</Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ticket.status.toLowerCase() !== "closed" && (
                <>
                  {!ticket.assignee && (
                    <DropdownMenuItem onClick={() => claimMutation.mutate()}>
                      Claim Ticket
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => closeMutation.mutate()}>
                    Close Ticket
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 border-b p-4">
        <div>
          <h3 className="mb-1 text-sm font-medium text-gray-700">Type</h3>
          <p className="text-sm text-gray-600">{ticket.type}</p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{ticket.assignee || "Unassigned"}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Created by {ticket.opener || "Unknown"}</span>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messagesLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-500">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message: any) => (
              <div key={message.id} className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium">{message.author?.name || "Unknown"}</span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {ticket.status.toLowerCase() !== "closed" && (
        <form onSubmit={handleSendMessage} className="border-t p-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="resize-none"
              rows={3}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!messageText.trim() || sendMessageMutation.isPending}>
                Send Message
              </Button>
            </div>
          </div>
        </form>
      )}
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
