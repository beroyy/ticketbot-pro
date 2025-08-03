import { z } from "zod";
import { getApiUrl, getWebUrl, getDevPorts } from "@ticketsbot/core";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),

  DISCORD_TOKEN: z.string().min(1),
  NEXT_PUBLIC_DISCORD_CLIENT_ID: z.string().regex(/^\d+$/),
  NEXT_PUBLIC_DISCORD_CLIENT_SECRET: z.string().min(1),

  BASE_DOMAIN: z.string().optional(),

  API_HOST: z.string().default("0.0.0.0"),
  API_SECRET: z.string().min(32).optional(),

  REDIS_URL: z.url().optional(),

  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional(),
  LOG_REQUESTS: z.stringbool().optional(),

  DEV_PERMISSIONS_HEX: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/)
    .optional(),
  DEV_GUILD_ID: z.string().regex(/^\d+$/).optional(),
  DEV_DB_AUTO_SEED: z.stringbool().optional(),
});

let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);

  const isDev = env.NODE_ENV === "development";

  const completeEnv = {
    ...env,
    LOG_LEVEL: env.LOG_LEVEL || (isDev ? "debug" : "warn"),
    LOG_REQUESTS: env.LOG_REQUESTS ?? isDev,
  };

  env = completeEnv as typeof env;

  if (isDev) {
    console.log("🔧 API Environment:", {
      environment: env.NODE_ENV,
      baseDomain: env.BASE_DOMAIN || "localhost (default)",
      apiUrl: getApiUrl(),
      webUrl: getWebUrl(),
      port: getDevPorts().api,
      host: env.API_HOST,
      redis: env.REDIS_URL ? "configured" : "not configured",
      logLevel: env.LOG_LEVEL,
    });
  }
} catch (error) {
  console.error("\n❌ API Environment Validation Failed!\n");

  if (error instanceof z.ZodError) {
    console.error("Validation errors:");
    error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    });
  }

  const requiredInProd = process.env.NODE_ENV === "production";

  console.error("\n📋 Required environment variables for API:");
  console.error("  NODE_ENV:", process.env.NODE_ENV || "❌ Missing");
  console.error("  DATABASE_URL:", process.env.DATABASE_URL ? "✓ Set" : "❌ Missing");
  console.error("  BETTER_AUTH_SECRET:", process.env.BETTER_AUTH_SECRET ? "✓ Set" : "❌ Missing");
  console.error(
    "  NEXT_PUBLIC_DISCORD_CLIENT_ID:",
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ? "✓ Set" : "❌ Missing"
  );
  console.error(
    "  NEXT_PUBLIC_DISCORD_CLIENT_SECRET:",
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_SECRET ? "✓ Set" : "❌ Missing"
  );
  console.error("  DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "✓ Set" : "❌ Missing");

  if (requiredInProd) {
    console.error(
      "  BASE_DOMAIN:",
      process.env.BASE_DOMAIN || "❌ Missing (required in production)"
    );
  }

  console.error("\n💡 Tips:");
  console.error("  - Check that .env file exists in the monorepo root");
  console.error("  - In production, set BASE_DOMAIN (e.g., ticketsbot.co)");
  console.error("  - URLs are automatically derived from NODE_ENV and BASE_DOMAIN");

  throw new Error("Environment validation failed");
}

export { env };

export type ApiEnv = typeof env;

export const isDevelopment = () => env.NODE_ENV === "development";
export const isProduction = () => env.NODE_ENV === "production";
export const isTest = () => env.NODE_ENV === "test";
