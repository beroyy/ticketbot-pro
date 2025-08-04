import { env } from "./env";
import { logger } from "./utils/logger";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { getApiUrl, getWebUrl, getDevPorts } from "@ticketsbot/core";
import type { AppEnv } from "./factory";
import { errorHandler } from "./utils/error-handler";
import { healthRoutes } from "./routes/health";
import { schemaRoutes } from "./routes/schemas";
import { userRoutes } from "./routes/user";
import { discordRoutes } from "./routes/discord";
import { panelRoutes } from "./routes/panels";
import { settingsRoutes } from "./routes/settings";
import { formRoutes } from "./routes/forms";
import { guildRoutes } from "./routes/guilds";
import { ticketRoutes } from "./routes/tickets";
import { permissionRoutes } from "./routes/permissions";
import { Redis } from "@ticketsbot/core";

const webUrl = getWebUrl();
const apiUrl = getApiUrl();
const apiPort = getDevPorts().api;

logger.debug("🔍 Derived URLs:", {
  webUrl,
  apiUrl,
  apiPort,
});

const app = new Hono<AppEnv>().onError(errorHandler);

const allowedOrigins = [webUrl, apiUrl];

logger.debug("🔒 CORS Configuration:", {
  allowedOrigins,
  credentials: true,
});

app.use("/*", async (c, next) => {
  const origin = c.req.header("origin");
  logger.request(c.req.method, c.req.path, origin);
  await next();
});

app.use(
  "/*",
  cors({
    origin: (origin) => {
      logger.debug("CORS check:", {
        origin,
        allowedOrigins,
        isAllowed: !origin || allowedOrigins.includes(origin),
      });

      if (!origin) {
        return undefined;
      }

      if (allowedOrigins.includes(origin)) {
        return origin;
      } else {
        logger.warn("CORS blocked request from:", origin);
        return null;
      }
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

const _routes = app
  .route("/health", healthRoutes)
  .route("/schemas", schemaRoutes)
  .route("/user", userRoutes)
  .route("/discord", discordRoutes)
  .route("/panels", panelRoutes)
  .route("/settings", settingsRoutes)
  .route("/forms", formRoutes)
  .route("/guilds", guildRoutes)
  .route("/tickets", ticketRoutes)
  .route("/permissions", permissionRoutes);

export type AppType = typeof _routes;

const port = apiPort;
const host = env.API_HOST;

Redis.initialize()
  .then(() => {
    logger.info("✅ Redis initialized (if configured)");
  })
  .catch((error: unknown) => {
    logger.warn("⚠️ Redis initialization failed:", error);
  });

logger.info(`🚀 API server listening on ${host}:${port} (${env.NODE_ENV})`);

serve({
  fetch: app.fetch,
  port,
  hostname: host,
});

process.on("SIGINT", async () => {
  logger.info("Received SIGINT. Graceful shutdown...");
  await Redis.shutdown();
  // eslint-disable-next-line no-process-exit -- Graceful shutdown requires process.exit
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM. Graceful shutdown...");
  await Redis.shutdown();
  // eslint-disable-next-line no-process-exit -- Graceful shutdown requires process.exit
  process.exit(0);
});
