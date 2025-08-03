import { createHmac } from "crypto";

/**
 * Test script for webhook endpoints
 * Usage: pnpm tsx scripts/test-webhooks.ts
 */

const WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET || "ticketsbot_webhook_secret_32chars";
const BASE_URL = process.env.WEB_URL || "http://localhost:3000";

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

function createWebhookSignature(payload: string, timestamp: string, secret: string): string {
  const signaturePayload = `${timestamp}.${payload}`;
  const signature = createHmac("sha256", secret)
    .update(signaturePayload)
    .digest("hex");
  return `sha256=${signature}`;
}

async function sendWebhook(endpoint: string, payload: WebhookPayload) {
  const timestamp = Date.now().toString();
  const body = JSON.stringify(payload);
  const signature = createWebhookSignature(body, timestamp, WEBHOOK_SECRET);

  console.log(`\n📤 Sending webhook to ${endpoint}...`);
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/api/webhooks/bot/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": signature,
        "x-webhook-timestamp": timestamp,
      },
      body,
    });

    const result = await response.json();
    console.log(`✅ Response (${response.status}):`, result);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

async function testWebhooks() {
  console.log("🧪 Testing TicketsBot Webhook Endpoints");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Secret: ${WEBHOOK_SECRET.substring(0, 10)}...`);

  // Test guild-joined
  await sendWebhook("guild-joined", {
    event: "guild.joined",
    timestamp: new Date().toISOString(),
    data: {
      guildId: "123456789012345678",
      guildName: "Test Server",
      ownerId: "098765432109876543",
      memberCount: 150,
    },
  });

  // Wait a bit between requests
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test setup-complete
  await sendWebhook("setup-complete", {
    event: "guild.setup_complete",
    timestamp: new Date().toISOString(),
    data: {
      guildId: "123456789012345678",
      supportCategoryId: "234567890123456789",
      transcriptsChannelId: "345678901234567890",
      logChannelId: "456789012345678901",
      defaultRoleId: "567890123456789012",
    },
  });

  // Wait a bit between requests
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test guild-left
  await sendWebhook("guild-left", {
    event: "guild.left",
    timestamp: new Date().toISOString(),
    data: {
      guildId: "123456789012345678",
    },
  });

  console.log("\n✨ Webhook tests completed!");
}

// Run tests
testWebhooks().catch(console.error);