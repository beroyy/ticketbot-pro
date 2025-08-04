export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || "",
  NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "",
  NEXT_PUBLIC_DISCORD_CLIENT_SECRET: process.env.NEXT_PUBLIC_DISCORD_CLIENT_SECRET || "",
  BASE_DOMAIN: process.env.BASE_DOMAIN,
  API_HOST: process.env.API_HOST || "0.0.0.0",
  API_SECRET: process.env.API_SECRET,
  REDIS_URL: process.env.REDIS_URL,
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_REQUESTS: process.env.LOG_REQUESTS === "true",
  DEV_PERMISSIONS_HEX: process.env.DEV_PERMISSIONS_HEX,
  DEV_GUILD_ID: process.env.DEV_GUILD_ID,
  DEV_DB_AUTO_SEED: process.env.DEV_DB_AUTO_SEED === "true",
};

export type ApiEnv = typeof env;

export const isDevelopment = () => env.NODE_ENV === "development";
export const isProduction = () => env.NODE_ENV === "production";
export const isTest = () => env.NODE_ENV === "test";
