# TicketsBot Webhook Endpoints

These webhook endpoints are used by the Discord bot to notify the web application of important events.

## Authentication

All webhook requests must include:
- `x-webhook-signature`: HMAC-SHA256 signature of the payload
- `x-webhook-timestamp`: Unix timestamp in milliseconds

The signature is calculated as: `sha256=HMAC-SHA256(timestamp + "." + body, BOT_WEBHOOK_SECRET)`

## Endpoints

### POST /api/webhooks/bot/guild-joined

Called when the bot joins a new Discord guild.

**Payload:**
```json
{
  "event": "guild.joined",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "guildId": "123456789012345678",
    "guildName": "My Server",
    "ownerId": "098765432109876543",
    "memberCount": 150
  }
}
```

**Actions:**
- Creates/updates guild in database
- Sets `botInstalled: true`

### POST /api/webhooks/bot/guild-left

Called when the bot leaves or is removed from a Discord guild.

**Payload:**
```json
{
  "event": "guild.left",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "guildId": "123456789012345678"
  }
}
```

**Actions:**
- Sets `botInstalled: false`
- Closes all open tickets with reason "Bot removed from server"

### POST /api/webhooks/bot/setup-complete

Called when the bot completes setup in a Discord guild.

**Payload:**
```json
{
  "event": "guild.setup_complete",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "guildId": "123456789012345678",
    "supportCategoryId": "234567890123456789",
    "transcriptsChannelId": "345678901234567890",
    "logChannelId": "456789012345678901",
    "defaultRoleId": "567890123456789012"
  }
}
```

**Actions:**
- Updates guild configuration
- Creates default "Support" role if provided

## Testing

Run the test script to verify webhooks are working:

```bash
cd apps/web
pnpm tsx scripts/test-webhooks.ts
```

## Security

- Webhook secret must be at least 32 characters
- Requests older than 5 minutes are rejected (replay attack prevention)
- Invalid signatures return 401 Unauthorized
- All errors are logged for debugging