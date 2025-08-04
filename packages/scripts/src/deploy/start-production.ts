#!/usr/bin/env tsx
/**
 * Production start script that runs all services without type checking
 * This avoids memory issues in production containers
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../..");

console.log("🚀 Starting production services...");

// Ensure Prisma client is generated
console.log("📦 Generating Prisma client...");
const prismaGenerate = spawn("pnpm", ["db:generate"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
});

prismaGenerate.on("exit", (code) => {
  if (code !== 0) {
    console.error("❌ Failed to generate Prisma client");
    process.exit(1);
  }

  console.log("✅ Prisma client generated");
  console.log("🏃 Starting all services...");

  // Start all services using turbo without build/typecheck
  const turboStart = spawn(
    "pnpm",
    ["turbo", "run", "start", "--filter=@ticketsbot/api", "--filter=@ticketsbot/bot", "--filter=@ticketsbot/web"],
    {
      cwd: rootDir,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        // Ensure we're in production mode
        NODE_ENV: "production",
      },
    }
  );

  // Handle graceful shutdown
  const shutdown = () => {
    console.log("\n🛑 Shutting down services...");
    turboStart.kill("SIGTERM");
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  turboStart.on("exit", (code) => {
    console.log(`Services exited with code ${code}`);
    process.exit(code || 0);
  });
});