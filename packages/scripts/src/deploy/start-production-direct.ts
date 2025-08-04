#!/usr/bin/env tsx
/**
 * Production start script that runs all services directly without Turborepo
 * This ensures all environment variables are passed through
 */

import { spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../..");

console.log("🚀 Starting production services (direct mode)...");

// Debug: Log environment variables
console.log("=== Environment Check ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("BASE_DOMAIN:", process.env.BASE_DOMAIN);
console.log("NEXT_PUBLIC_BASE_DOMAIN:", process.env.NEXT_PUBLIC_BASE_DOMAIN);
console.log("BETTER_AUTH_SECRET:", process.env.BETTER_AUTH_SECRET ? "SET" : "NOT SET");
console.log("POSTHOG_API_KEY:", process.env.POSTHOG_API_KEY ? "SET" : "NOT SET");
console.log("========================");

// Ensure Prisma client is generated
console.log("📦 Generating Prisma client...");
const prismaGenerate = spawn("pnpm", ["--filter", "@ticketsbot/core", "db:generate"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
});

prismaGenerate.on("exit", async (code) => {
  if (code !== 0) {
    console.error("❌ Failed to generate Prisma client");
    process.exit(1);
  }

  console.log("✅ Prisma client generated");
  console.log("🏃 Starting all services directly...");

  const services: ChildProcess[] = [];

  // Start API
  console.log("🚀 Starting API...");
  const apiProcess = spawn("pnpm", ["start"], {
    cwd: path.join(rootDir, "apps/api"),
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      PORT: process.env.API_PORT || "3001",
    },
  });
  services.push(apiProcess);

  // Start Bot
  console.log("🤖 Starting Bot...");
  const botProcess = spawn("pnpm", ["start"], {
    cwd: path.join(rootDir, "apps/bot"),
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      PORT: process.env.BOT_PORT || "3002",
    },
  });
  services.push(botProcess);

  // Start Web
  console.log("🌐 Starting Web...");
  const webProcess = spawn("pnpm", ["start"], {
    cwd: path.join(rootDir, "apps/web"),
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      PORT: process.env.PORT || "3000",
    },
  });
  services.push(webProcess);

  // Handle graceful shutdown
  const shutdown = () => {
    console.log("\n🛑 Shutting down services...");
    services.forEach(service => {
      service.kill("SIGTERM");
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Exit if any service exits
  services.forEach(service => {
    service.on("exit", (code) => {
      console.log(`Service exited with code ${code}`);
      shutdown();
      process.exit(code || 0);
    });
  });
});