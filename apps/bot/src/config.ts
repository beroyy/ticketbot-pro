export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || "",
  NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "",
  NEXT_PUBLIC_DISCORD_CLIENT_SECRET: process.env.NEXT_PUBLIC_DISCORD_CLIENT_SECRET || "",
  BASE_DOMAIN: process.env.BASE_DOMAIN,
  DISCORD_BOT_PREFIX: process.env.DISCORD_BOT_PREFIX || "!",
  DISCORD_BOT_STATUS: process.env.DISCORD_BOT_STATUS,
  REDIS_URL: process.env.REDIS_URL,
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_REQUESTS: process.env.LOG_REQUESTS === "true",
  DEV_PERMISSIONS_HEX: process.env.DEV_PERMISSIONS_HEX,
  DEV_GUILD_ID: process.env.DEV_GUILD_ID,
  DEV_DB_AUTO_SEED: process.env.DEV_DB_AUTO_SEED === "true",
};

export const botConfig = {
  discordToken: env.DISCORD_TOKEN,
  clientId: env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
  databaseUrl: env.DATABASE_URL,
  environment: env.NODE_ENV,
  prefix: env.DISCORD_BOT_PREFIX,
  status: env.DISCORD_BOT_STATUS,
};

export const isDevelopment = () => env.NODE_ENV === "development";
export const isProduction = () => env.NODE_ENV === "production";
