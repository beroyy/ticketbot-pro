# Server-Sent Events (SSE) for Real-Time Updates

## Overview

This document describes the SSE pattern implemented for real-time guild updates in the TicketsBot web application. When a Discord bot joins a guild, the web UI updates automatically without polling or page refresh.

## Architecture

```
User on /guilds → SSE Connection → Install Bot → Discord → Webhook → 
Update DB → Publish SSE Event → Client Refresh → Updated UI
```

## Core Components

### 1. Event Broadcasting System (`/lib/sse/guild-events.ts`)

Singleton EventEmitter that manages guild-related events with user-specific channels:

```typescript
class GuildEventBroadcaster extends EventEmitter {
  // Emit user-specific events
  notifyGuildJoined(userId: string, guildId: string, guildName: string)
  
  // Subscribe to user events
  subscribeToUserEvents(userId: string, callback: (event: GuildEvent) => void): () => void
}
```

**Key Features:**
- User-scoped events for security isolation
- Support for multiple event types (guild-joined, guild-left, bot-configured)
- Automatic cleanup with unsubscribe functions
- In-memory for single-instance deployments

### 2. SSE Route Handler (`/app/api/guilds/events/route.ts`)

Server endpoint that establishes and maintains SSE connections:

```typescript
export async function GET(request: Request) {
  // 1. Authenticate user session
  // 2. Create ReadableStream for SSE
  // 3. Send heartbeat every 30s
  // 4. Subscribe to user-specific events
  // 5. Handle cleanup on disconnect
}
```

**Key Features:**
- Authentication required before connection
- Heartbeat keeps connection alive through proxies
- Proper cleanup prevents memory leaks
- Standard SSE headers for compatibility

### 3. Client SSE Listener (`/components/guild-updates-listener.tsx`)

React component that manages the client-side SSE connection:

```typescript
export function GuildUpdatesListener() {
  // 1. Only connects on /guilds page
  // 2. Establishes EventSource connection
  // 3. Handles reconnection with exponential backoff
  // 4. Shows toast notifications
  // 5. Triggers router.refresh() on events
}
```

**Key Features:**
- Page-specific activation
- Automatic reconnection logic
- User-friendly notifications
- Optional connection status indicator

### 4. Webhook Integration

The bot's guild-joined webhook broadcasts SSE events:

```typescript
// In webhook handler
if (data.ownerId) {
  const betterAuthUser = await User.findBetterAuthUserByDiscordId(data.ownerId);
  if (betterAuthUser) {
    guildEvents.notifyGuildJoined(betterAuthUser.id, data.guildId, data.guildName);
  }
}
```

## Implementation Details

### Security Considerations

1. **Authentication**: SSE endpoint requires valid session
2. **User Isolation**: Events scoped to individual users
3. **No Sensitive Data**: Only guild ID and name transmitted
4. **CORS Headers**: Properly configured for same-origin

### Performance Optimizations

1. **Lazy Connection**: Only connects when on relevant page
2. **Heartbeat**: Prevents timeout through proxies/load balancers
3. **Cleanup**: Proper event listener removal
4. **Resource Limits**: Max listeners set to prevent memory issues

### Error Handling

1. **Exponential Backoff**: Reconnect delays: 1s, 2s, 4s, 8s, 16s, 30s max
2. **Max Retries**: Stops after 5 failed attempts
3. **Graceful Degradation**: Webhook continues even if SSE fails
4. **User Feedback**: Toast notifications for connection issues

## Future Enhancements

### 1. Redis Integration for Horizontal Scaling

Replace EventEmitter with Redis pub/sub for multi-instance deployments:

```typescript
// Event broadcaster with Redis
export class GuildEventBroadcaster {
  async notifyGuildJoined(userId: string, guildId: string, guildName: string) {
    await redis.publish('guild-updates', JSON.stringify({
      userId,
      type: 'guild-joined',
      guildId,
      guildName,
      timestamp: Date.now()
    }));
  }
}

// SSE route subscribes to Redis
const subscriber = redis.duplicate();
await subscriber.subscribe('guild-updates');
subscriber.on('message', (channel, message) => {
  const event = JSON.parse(message);
  if (event.userId === userId) {
    send(`data: ${message}\n\n`);
  }
});
```

### 2. Enhanced Connection Management

**Page Visibility API Integration:**
```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Pause connection when tab is hidden
      eventSource?.close();
    } else {
      // Resume connection when tab is visible
      connect();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

**Connection Pooling:**
- Limit concurrent connections per user
- Implement connection sharing across tabs
- Add connection metrics and monitoring

### 3. Smart Event Filtering

```typescript
// Subscribe to specific guild events
guildEvents.subscribeToGuildEvents(userId, guildId, (event) => {
  // Only receive events for specific guild
});

// Event types with metadata
interface GuildEvent {
  type: 'guild-joined' | 'guild-left' | 'bot-configured' | 'settings-updated';
  guildId: string;
  guildName: string;
  timestamp: number;
  metadata?: {
    previousState?: any;
    newState?: any;
    changedBy?: string;
  };
}
```

### 4. Optimistic UI Updates

```typescript
// When user clicks "Install Bot"
const [installingGuilds, setInstallingGuilds] = useState<Set<string>>(new Set());

const handleInstallBot = (guildId: string) => {
  setInstallingGuilds(prev => new Set(prev).add(guildId));
  window.open(inviteUrl, '_blank');
  
  // Start listening for this specific guild
  startListeningForGuild(guildId);
};

// Show loading state for guilds being installed
{installingGuilds.has(guild.id) && <LoadingSpinner />}
```

### 5. Event History and Replay

```typescript
// Store recent events for replay on reconnect
const recentEvents = new Map<string, GuildEvent[]>();

// On reconnect, check for missed events
const getMissedEvents = (userId: string, since: number) => {
  return recentEvents.get(userId)?.filter(e => e.timestamp > since) || [];
};
```

### 6. Webhook Retry Queue

For failed SSE notifications:

```typescript
// Queue failed notifications for retry
const retryQueue = new Map<string, GuildEvent>();

// Retry failed notifications when user reconnects
eventSource.onopen = () => {
  const queuedEvents = retryQueue.get(userId);
  if (queuedEvents) {
    queuedEvents.forEach(event => {
      guildEvents.notifyGuildJoined(userId, event.guildId, event.guildName);
    });
    retryQueue.delete(userId);
  }
};
```

### 7. Analytics and Monitoring

```typescript
// Track SSE metrics
interface SSEMetrics {
  activeConnections: number;
  totalEvents: number;
  eventsByType: Record<string, number>;
  averageLatency: number;
  reconnectRate: number;
}

// Log events for debugging
logger.info('SSE Event', {
  userId,
  eventType: 'guild-joined',
  guildId,
  connectionDuration: Date.now() - connectionStart,
});
```

## Usage in Other Features

This SSE pattern can be extended to other real-time features:

1. **Live Ticket Updates**: Show new tickets as they're created
2. **Team Activity**: Real-time team member status changes
3. **Settings Sync**: Propagate settings changes across sessions
4. **Notification System**: Push notifications for important events

## Best Practices

1. **Always authenticate** SSE connections
2. **Scope events** to prevent data leaks
3. **Implement heartbeats** for reliable connections
4. **Handle reconnection** gracefully
5. **Provide user feedback** for connection states
6. **Clean up resources** to prevent memory leaks
7. **Consider scale early** - plan for Redis when needed
8. **Monitor performance** - track metrics and errors

## Conclusion

This SSE implementation provides real-time updates with minimal complexity, perfect for single-instance deployments. The pattern is extensible and can be enhanced with Redis for horizontal scaling when needed. The key advantage is knowing exactly when to update (via webhooks) rather than constantly polling for changes.