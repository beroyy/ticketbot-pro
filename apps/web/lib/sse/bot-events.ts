import { EventEmitter } from 'events';
import type { BotEvent } from '@/lib/webhooks';

/**
 * SSE event types that can be broadcast to clients
 */
export interface SSEEvent {
  type: BotEvent['type'];
  data: BotEvent['data'];
  timestamp: number;
}

/**
 * In-memory event broadcaster for all bot-related SSE events
 * Scoped to individual users and guilds for security
 */
class BotEventBroadcaster extends EventEmitter {
  private static instance: BotEventBroadcaster;
  
  private constructor() {
    super();
    // Increase max listeners to handle multiple concurrent connections
    this.setMaxListeners(1000);
  }
  
  static getInstance(): BotEventBroadcaster {
    if (!this.instance) {
      this.instance = new BotEventBroadcaster();
    }
    return this.instance;
  }
  
  /**
   * Emit an event to all listeners
   */
  private emitEvent(channel: string, event: SSEEvent) {
    this.emit(channel, event);
    console.log(`[SSE] Emitted ${event.type} event on channel ${channel}`);
  }
  
  /**
   * Broadcast event to user channel
   */
  notifyUser(userId: string, event: BotEvent) {
    const sseEvent: SSEEvent = {
      type: event.type,
      data: event.data,
      timestamp: Date.now()
    };
    
    this.emitEvent(`user:${userId}`, sseEvent);
  }
  
  /**
   * Broadcast event to guild channel
   * All users with access to the guild will receive this
   */
  notifyGuild(guildId: string, event: BotEvent) {
    const sseEvent: SSEEvent = {
      type: event.type,
      data: event.data,
      timestamp: Date.now()
    };
    
    this.emitEvent(`guild:${guildId}`, sseEvent);
  }
  
  /**
   * Broadcast event to specific ticket channel
   * For granular ticket-specific updates
   */
  notifyTicket(guildId: string, ticketId: number, event: BotEvent) {
    const sseEvent: SSEEvent = {
      type: event.type,
      data: event.data,
      timestamp: Date.now()
    };
    
    this.emitEvent(`ticket:${guildId}:${ticketId}`, sseEvent);
  }
  
  /**
   * Subscribe to events for a specific user
   * Returns unsubscribe function
   */
  subscribeToUserEvents(userId: string, callback: (event: SSEEvent) => void): () => void {
    const channel = `user:${userId}`;
    this.on(channel, callback);
    
    console.log(`[SSE] User ${userId} subscribed to bot events`);
    
    // Return unsubscribe function
    return () => {
      this.off(channel, callback);
      console.log(`[SSE] User ${userId} unsubscribed from bot events`);
    };
  }
  
  /**
   * Subscribe to events for a specific guild
   * Returns unsubscribe function
   */
  subscribeToGuildEvents(guildId: string, callback: (event: SSEEvent) => void): () => void {
    const channel = `guild:${guildId}`;
    this.on(channel, callback);
    
    console.log(`[SSE] Subscribed to guild ${guildId} events`);
    
    // Return unsubscribe function
    return () => {
      this.off(channel, callback);
      console.log(`[SSE] Unsubscribed from guild ${guildId} events`);
    };
  }
  
  /**
   * Subscribe to events for a specific ticket
   * Returns unsubscribe function
   */
  subscribeToTicketEvents(guildId: string, ticketId: number, callback: (event: SSEEvent) => void): () => void {
    const channel = `ticket:${guildId}:${ticketId}`;
    this.on(channel, callback);
    
    console.log(`[SSE] Subscribed to ticket ${ticketId} events`);
    
    // Return unsubscribe function
    return () => {
      this.off(channel, callback);
      console.log(`[SSE] Unsubscribed from ticket ${ticketId} events`);
    };
  }
  
  /**
   * Subscribe to multiple channels at once
   * Returns unsubscribe function that cleans up all subscriptions
   */
  subscribeToMultiple(
    subscriptions: Array<{
      type: 'user' | 'guild' | 'ticket';
      id: string | { guildId: string; ticketId: number };
    }>,
    callback: (event: SSEEvent) => void
  ): () => void {
    const unsubscribers: Array<() => void> = [];
    
    for (const sub of subscriptions) {
      if (sub.type === 'user' && typeof sub.id === 'string') {
        unsubscribers.push(this.subscribeToUserEvents(sub.id, callback));
      } else if (sub.type === 'guild' && typeof sub.id === 'string') {
        unsubscribers.push(this.subscribeToGuildEvents(sub.id, callback));
      } else if (sub.type === 'ticket' && typeof sub.id === 'object') {
        unsubscribers.push(this.subscribeToTicketEvents(sub.id.guildId, sub.id.ticketId, callback));
      }
    }
    
    // Return function that unsubscribes from all
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }
  
  /**
   * Get current listener counts for monitoring
   */
  getListenerCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    const eventNames = this.eventNames() as string[];
    
    for (const eventName of eventNames) {
      counts[eventName] = this.listenerCount(eventName);
    }
    
    return counts;
  }
}

// Export singleton instance
export const botEvents = BotEventBroadcaster.getInstance();