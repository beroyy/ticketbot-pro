export type BotConfig = {
  discordToken: string;
  clientId: string;
  databaseUrl: string;
  environment: "development" | "production";
};

export type TicketEmbedOptions = {
  title?: string;
  description?: string;
  color?: number;
  footer?: string;
  timestamp?: boolean;
};

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours.toString()}h ${minutes.toString()}m ${remainingSeconds.toString()}s`;
  } else if (minutes > 0) {
    return `${minutes.toString()}m ${remainingSeconds.toString()}s`;
  } else {
    return `${remainingSeconds.toString()}s`;
  }
}

// TODO: which ones am I actually using?
// export { parseDiscordId, formatDiscordId } from "./discord-id";

export function parseDiscordId(id: string): string {
  if (!/^\d+$/.test(id)) {
    throw new Error(`Invalid Discord ID format: "${id}". Discord IDs must be numeric.`);
  }
  return id;
}

export function formatDiscordId(id: string): string {
  return id;
}

export function createTicketChannelName(
  ticketId: number,
  username: string,
  panelChannelPrefix?: string,
  ticketNameFormat?: string
): string {
  if (panelChannelPrefix) {
    return `${panelChannelPrefix}-${username.toLowerCase()}`;
  }

  if (ticketNameFormat === "ticket-{username}") {
    return `ticket-${username.toLowerCase()}`;
  }

  return `ticket-${ticketId.toString()}`;
}

export function createTicketThreadName(ticketId: number, username: string): string {
  return `Ticket #${ticketId.toString()} - ${username}`;
}

export { PermissionUtils } from "./permissions";

export { getWebUrl, getApiUrl, getAllUrls, getDevPorts } from "./env-urls";

export { logger, createLogger, type LogLevel } from "./logger";

export const isProduction = () => process.env.NODE_ENV === "production";
