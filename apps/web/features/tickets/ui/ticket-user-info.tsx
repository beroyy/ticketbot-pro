import Image from "next/image";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Shield, Crown, Users, Clock } from "lucide-react";
import type { Ticket } from "@/features/tickets/types";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

type TicketUserInfoProps = {
  ticket: Ticket;
};

export function TicketUserInfo({ ticket }: TicketUserInfoProps) {
  const displayName =
    (ticket.openerMetadata as { displayName?: string } | null)?.displayName ||
    ticket.opener ||
    "Unknown User";

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center space-x-4">
        <UserMetadataPopover metadata={ticket.openerMetadata}>
          <button className="h-12 w-12 cursor-pointer rounded-full transition-all hover:ring-2 hover:ring-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ticket.openerImage || ticket.openerAvatar ? (
              <Image
                src={ticket.openerImage || ticket.openerAvatar || ""}
                alt={ticket.opener || "Ticket opener"}
                className="size-full rounded-full object-cover"
                width={48}
                height={48}
              />
            ) : (
              <div className="flex size-full items-center justify-center rounded-full bg-orange-100">
                <span className="font-medium text-orange-600">
                  {ticket.opener?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            )}
          </button>
        </UserMetadataPopover>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
          <p className="text-sm text-gray-500">{ticket.opener || "Unknown User"}</p>
        </div>
      </div>
      <div className="border-t border-gray-200"></div>
    </div>
  );
}

type UserMetadataPopoverProps = {
  children: React.ReactNode;
  metadata: unknown;
};

function UserMetadataPopover({ children, metadata }: UserMetadataPopoverProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-0">
        <UserMetadataContent metadata={metadata} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMetadataContent({ metadata }: { metadata: unknown }): React.JSX.Element {
  if (!metadata) return <div className="p-4 text-sm text-gray-500">No metadata available</div>;

  const isObjectWithProp = (obj: unknown, prop: string): obj is Record<string, unknown> => {
    return obj !== null && typeof obj === "object" && prop in obj;
  };

  if (!isObjectWithProp(metadata, "displayName")) {
    return <div className="p-4 text-sm text-gray-500">Invalid metadata format</div>;
  }

  const metadataObj = metadata;

  const guildData =
    isObjectWithProp(metadata, "guilds") && metadata["guilds"]
      ? (Object.values(metadata["guilds"])[0] as Record<string, unknown>)
      : null;

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format("MMM D, YYYY");
  };

  const formatAge = (days: number) => {
    if (days < 30) return `${String(days)} days`;
    if (days < 365) return `${String(Math.floor(days / 30))} months`;
    return `${String(Math.floor(days / 365))} years`;
  };

  return (
    <div className="w-80 p-4">
      <h3 className="mb-3 font-semibold text-gray-900">User Information</h3>

      <div className="space-y-3 text-sm">
        {/* Display Name */}
        {typeof metadataObj["displayName"] === "string" && metadataObj["displayName"] && (
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Display Name:</span>
            <span className="font-medium">{metadataObj["displayName"]}</span>
          </div>
        )}

        {/* Account Age */}
        {typeof metadataObj["accountAgeInDays"] === "number" && metadataObj["accountAgeInDays"] && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Account Age:</span>
            <span className="font-medium">{formatAge(metadataObj["accountAgeInDays"])}</span>
          </div>
        )}

        {/* Account Created */}
        {typeof metadataObj["accountCreatedAt"] === "string" && metadataObj["accountCreatedAt"] && (
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Created:</span>
            <span className="font-medium">{formatDate(metadataObj["accountCreatedAt"])}</span>
          </div>
        )}

        {guildData && (
          <>
            <div className="mt-3 border-t pt-3">
              <h4 className="mb-2 font-medium text-gray-900">Server Information</h4>
            </div>

            {/* Server Join Date */}
            {guildData["joinedAt"] && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-gray-600">Joined Server:</span>
                <span className="font-medium">{formatDate(guildData["joinedAt"] as string)}</span>
              </div>
            )}

            {/* Server Age */}
            {guildData["serverAgeInDays"] && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-gray-600">Server Age:</span>
                <span className="font-medium">
                  {formatAge(guildData["serverAgeInDays"] as number)}
                </span>
              </div>
            )}

            {/* Booster Status */}
            {guildData["isBooster"] && (
              <div className="flex items-center space-x-2">
                <Crown className="h-4 w-4 text-purple-500" />
                <span className="text-gray-600">Server Booster</span>
                {typeof guildData["premiumSince"] === "string" && guildData["premiumSince"] && (
                  <span className="text-xs text-gray-500">
                    since {formatDate(guildData["premiumSince"])}
                  </span>
                )}
              </div>
            )}

            {/* Nickname */}
            {guildData["nickname"] && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-gray-600">Nickname:</span>
                <span className="font-medium">{guildData["nickname"] as string}</span>
              </div>
            )}

            {/* Roles */}
            {Array.isArray(guildData["roles"]) && guildData["roles"].length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-orange-500" />
                  <span className="text-gray-600">Roles:</span>
                </div>
                <div className="ml-6 flex flex-wrap gap-1">
                  {Array.isArray(guildData["roles"]) &&
                    guildData["roles"]
                      .slice(0, 5)
                      .map((role: Record<string, unknown>, index: number) => (
                        <span
                          key={(role["id"] as string) || index}
                          className="inline-block rounded px-2 py-1 text-xs"
                          style={{
                            backgroundColor:
                              role["color"] !== "#000000"
                                ? (role["color"] as string) + "20"
                                : "#f3f4f6",
                            color:
                              role["color"] !== "#000000" ? (role["color"] as string) : "#6b7280",
                          }}
                        >
                          {role["name"] as string}
                        </span>
                      ))}
                  {Array.isArray(guildData["roles"]) && guildData["roles"].length > 5 && (
                    <span className="text-xs text-gray-500">
                      +{guildData["roles"].length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
