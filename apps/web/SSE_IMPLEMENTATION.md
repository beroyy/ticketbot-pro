# SSE Implementation Notes

## Current State

The webhook/SSE real-time notification system is fully implemented with the following architecture:

```
Discord Bot → Webhook → SSE Broadcaster → Client Store → UI Updates
```

## Event Flow

1. **Bot sends events** via webhook to `/api/webhooks/bot/events`
2. **Webhook handler** validates and broadcasts to appropriate channels:
   - User-specific events: `botEvents.notifyUser(userId, event)`
   - Guild-wide events: `botEvents.notifyGuild(guildId, event)`
   - Ticket-specific events: `botEvents.notifyTicket(guildId, ticketId, event)`
3. **SSE endpoint** at `/api/guilds/events` streams events to connected clients
4. **Client store** receives events and triggers UI updates (toasts, refreshes)

## 🚨 Production TODOs

### 1. Guild Authorization (Critical)

The SSE endpoint currently **only subscribes to user-specific events**. This means guild-wide events won't reach users!

**Required implementation:**
```typescript
// In /api/guilds/events/route.ts
const userGuilds = await Guild.getAccessibleGuilds(userId);
const subscriptions = [
  { type: 'user', id: userId },
  ...userGuilds.map(g => ({ type: 'guild', id: g.id }))
];
```

**To implement `Guild.getAccessibleGuilds()`:**
- Query guilds where user is owner
- Query guilds where user is a team member
- Return combined list with proper permissions check

### 2. Event Types

All 13 event types are implemented:
- Guild: `joined`, `left`, `setup_complete`
- Ticket: `message_sent`, `status_changed`, `claimed`, `closed`
- Team: `role_created`, `role_updated`, `role_deleted`, `member_assigned`, `member_unassigned`
- Member: `left`

### 3. Security Considerations

- Events are scoped to channels (user/guild/ticket)
- Webhook validation uses HMAC signatures
- SSE requires authentication via Better Auth session
- **Missing**: Guild membership verification in SSE endpoint

## Environment Variables

Required for webhooks to work:
```env
BOT_WEBHOOK_SECRET=your-secret-here
```

## Testing

To test the complete flow:
1. Ensure bot and web are running
2. Have bot join a guild
3. Watch for toast notification in web UI
4. Check browser console for SSE connection logs