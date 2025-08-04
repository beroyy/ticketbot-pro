import "@sapphire/plugin-logger/register";
import "@sapphire/plugin-subcommands/register";
import { botConfig } from "@bot/config";
import { BaseBotClient, configurePermissionProvider } from "@bot/lib/sapphire-extensions";
import { GatewayIntentBits } from "discord.js";
import { container } from "@sapphire/framework";
import { join as _join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { teamPermissionChecker } from "@bot/lib/team-permission-checker";
import { ScheduledTask } from "@ticketsbot/core/domains";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TicketsBotClient extends BaseBotClient {
  public override async login(token?: string): Promise<string> {
    container.logger.info("Initializing TicketsBot...");
    return super.login(token);
  }
}

configurePermissionProvider(teamPermissionChecker);

const client = new TicketsBotClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  baseUserDirectory: __dirname,
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT. Graceful shutdown...");

  try {
    await ScheduledTask.shutdown();
    console.log("✅ Scheduled task system shut down");
  } catch (error) {
    console.error("❌ Error shutting down scheduled task system:", error);
  }

  void client.destroy();
  // eslint-disable-next-line no-process-exit
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Graceful shutdown...");

  try {
    await ScheduledTask.shutdown();
    console.log("✅ Scheduled task system shut down");
  } catch (error) {
    console.error("❌ Error shutting down scheduled task system:", error);
  }

  void client.destroy();
  // eslint-disable-next-line no-process-exit
  process.exit(0);
});

process.on("unhandledRejection", (error) => {
  client.logger.error("Unhandled promise rejection:", error);
});

void client.login(botConfig.discordToken);
