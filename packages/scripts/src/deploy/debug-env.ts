#!/usr/bin/env tsx

console.log("=== Environment Debug ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("BASE_DOMAIN:", process.env.BASE_DOMAIN);
console.log("NEXT_PUBLIC_BASE_DOMAIN:", process.env.NEXT_PUBLIC_BASE_DOMAIN);
console.log("BETTER_AUTH_SECRET:", process.env.BETTER_AUTH_SECRET ? "SET (hidden)" : "NOT SET");
console.log("POSTHOG_API_KEY:", process.env.POSTHOG_API_KEY ? "SET (hidden)" : "NOT SET");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "SET (hidden)" : "NOT SET");
console.log("DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "SET (hidden)" : "NOT SET");
console.log("========================");