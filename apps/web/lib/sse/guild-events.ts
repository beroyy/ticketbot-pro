import { EventEmitter } from 'events';

interface GuildEvent {
  type: 'guild-joined' | 'guild-left' | 'bot-configured';
  guildId: string;
  guildName: string;
  timestamp: number;
}

/**
 * In-memory event broadcaster for guild-related SSE events
 * Scoped to individual users for security
 */
class GuildEventBroadcaster extends EventEmitter {
  private static instance: GuildEventBroadcaster;
  
  private constructor() {
    super();
    // Increase max listeners to handle multiple concurrent connections
    this.setMaxListeners(100);
  }
  
  static getInstance(): GuildEventBroadcaster {
    if (!this.instance) {
      this.instance = new GuildEventBroadcaster();
    }
    return this.instance;
  }
  
  /**
   * Notify that a bot has joined a guild
   * Emits to specific user channel
   */
  notifyGuildJoined(userId: string, guildId: string, guildName: string) {
    const event: GuildEvent = {
      type: 'guild-joined',
      guildId,
      guildName,
      timestamp: Date.now()
    };
    
    this.emit(`user:${userId}`, event);
    console.log(`[SSE] Emitted guild-joined event for user ${userId}, guild ${guildName}`);
  }
  
  /**
   * Subscribe to events for a specific user
   * Returns unsubscribe function
   */
  subscribeToUserEvents(userId: string, callback: (event: GuildEvent) => void): () => void {
    const channel = `user:${userId}`;
    this.on(channel, callback);
    
    console.log(`[SSE] User ${userId} subscribed to guild events`);
    
    // Return unsubscribe function
    return () => {
      this.off(channel, callback);
      console.log(`[SSE] User ${userId} unsubscribed from guild events`);
    };
  }
  
  /**
   * Get current listener count for monitoring
   */
  getListenerCount(userId: string): number {
    return this.listenerCount(`user:${userId}`);
  }
}

// Export singleton instance
export const guildEvents = GuildEventBroadcaster.getInstance();

// Export types
export type { GuildEvent };