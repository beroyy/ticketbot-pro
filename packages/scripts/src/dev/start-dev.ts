#!/usr/bin/env tsx

import { config } from "dotenv";
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  checkPostgresConnection,
  checkDatabaseSchema,
  checkRedisConnection,
} from "./check-services";
import { initializeDatabase } from "../db/init-db";
import { main as seedDatabase } from "../db/seeders/index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../../..");
const envPath = path.join(rootDir, ".env");

config({ path: envPath });

type Flags = {
  help: boolean;
  seed: boolean;
  noRedis: boolean;
  skipChecks: boolean;
  reset: boolean;
};

function parseFlags(args: string[]): Flags {
  return {
    help: args.includes("--help") || args.includes("-h"),
    seed: args.includes("--seed"),
    noRedis: args.includes("--no-redis"),
    skipChecks: args.includes("--skip-checks"),
    reset: args.includes("--reset"),
  };
}

function showHelp() {
  console.log(`
🚀 TicketsBot Development Environment

Usage: pnpm dev [options]

Options:
  --seed          Seed database with test data
  --no-redis      Skip Redis startup checks
  --skip-checks   Skip all service checks (fast start)
  --reset         Reset database before starting
  --help, -h      Show this help message

Default behavior:
  - Checks and initializes PostgreSQL if needed
  - Checks and starts Redis if needed  
  - Does NOT seed database (use --seed for test data)

Examples:
  pnpm dev                 # Standard development
  pnpm dev --seed          # Include test data
  pnpm dev --skip-checks   # Fast restart
  pnpm dev --reset --seed  # Fresh start with test data
`);
}

async function waitForService(
  checkFn: () => Promise<boolean>,
  serviceName: string,
  maxAttempts = 10,
  delayMs = 1000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkFn()) {
      return true;
    }
    if (i < maxAttempts - 1) {
      process.stdout.write(`   Waiting for ${serviceName}...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      process.stdout.write("\r");
    }
  }
  return false;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  if (flags.help) {
    showHelp();
    process.exit(0);
  }

  if (!fs.existsSync(envPath)) {
    console.error("❌ No .env file found!");
    console.error("📋 Copy .env.example to .env and fill in your values:");
    console.error("\n   cp .env.example .env\n");
    console.error("Then edit .env with your configuration.");
    process.exit(1);
  }

  console.log("🚀 Starting TicketsBot Development Environment...\n");

  try {
    if (!flags.skipChecks) {
      console.log("🔍 Checking PostgreSQL connection...");
      const pgConnected = await checkPostgresConnection();
      if (!pgConnected) {
        console.error("❌ PostgreSQL connection failed!");
        console.error("📋 Make sure PostgreSQL is running and DATABASE_URL is correct");
        console.error("   You can use Neon, Supabase, or local PostgreSQL");
        process.exit(1);
      }
      console.log("✅ PostgreSQL connected");

      if (flags.reset) {
        console.log("\n🔄 Resetting database...");
        try {
          execSync("pnpm --filter @ticketsbot/core db:push:force", {
            stdio: "inherit",
            cwd: rootDir,
          });
          console.log("✅ Database reset complete");
        } catch (error) {
          console.error("❌ Failed to reset database");
          throw error;
        }
      }

      console.log("\n🔍 Checking database schema...");
      const schemaExists = await checkDatabaseSchema();
      if (!schemaExists) {
        console.log("📦 Database not initialized. Initializing...");
        await initializeDatabase();
      } else {
        console.log("✅ Database schema ready");
      }

      if (!flags.noRedis) {
        console.log("\n🔍 Checking Redis...");
        const redisRunning = await checkRedisConnection();
        if (!redisRunning) {
          console.log("🐳 Starting Redis with Docker...");
          try {
            try {
              execSync("docker --version", { stdio: "ignore" });
            } catch {
              console.error("❌ Docker not found. Please install Docker or use --no-redis");
              console.error("   Download Docker: https://www.docker.com/get-started");
              process.exit(1);
            }

            execSync("docker compose up -d redis", {
              stdio: "inherit",
              cwd: rootDir,
            });

            const redisReady = await waitForService(checkRedisConnection, "Redis", 10, 1000);
            if (!redisReady) {
              console.warn("⚠️  Redis started but not responding. Some features may not work.");
            } else {
              console.log("✅ Redis started");
            }
          } catch (error) {
            console.warn("⚠️  Could not start Redis. Some features may not work.");
            console.warn("   Run 'docker compose up -d redis' manually if needed.");
          }
        } else {
          console.log("✅ Redis available");
        }
      } else {
        console.log("\n⚠️  Skipping Redis (--no-redis flag)");
      }

      if (flags.seed) {
        console.log("\n🌱 Seeding database with test data...");
        try {
          await seedDatabase();
          console.log("✅ Database seeded");
        } catch (error) {
          console.error("❌ Seeding failed:", error);
          console.error(
            "   You can continue without test data or fix the issue and run: pnpm db:seed"
          );
        }
      }
    } else {
      console.log("⚡ Skipping all checks (--skip-checks flag)");
    }

    console.log("\n🚀 Starting all services...\n");
    const turbo = spawn("turbo", ["run", "dev"], {
      cwd: rootDir,
      stdio: "inherit",
      shell: true,
    });

    const shutdown = () => {
      console.log("\n🛑 Shutting down services...");
      turbo.kill("SIGTERM");

      if (!flags.noRedis && !flags.skipChecks) {
        try {
          execSync("docker compose stop redis", {
            stdio: "ignore",
            cwd: rootDir,
          });
        } catch {
          // Ignore errors on shutdown
        }
      }

      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    turbo.on("exit", (code) => {
      if (code !== null) {
        process.exit(code);
      }
    });
  } catch (error) {
    console.error("\n❌ Failed to start development environment:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
