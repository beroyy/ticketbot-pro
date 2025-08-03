'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Client component that listens for real-time guild updates via SSE
 * Only active on the /guilds page
 */
export function GuildUpdatesListener() {
  const router = useRouter();
  const pathname = usePathname();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  useEffect(() => {
    // Only connect on the guilds page
    if (pathname !== '/guilds') {
      return;
    }
    
    const connect = () => {
      // Clean up any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      setConnectionStatus('connecting');
      console.log('[SSE] Connecting to guild events...');
      
      const eventSource = new EventSource('/api/guilds/events', {
        withCredentials: true,
      });
      
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        console.log('[SSE] Connection established');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] Received event:', data);
          
          if (data.type === 'connected') {
            // Initial connection confirmed
            return;
          }
          
          if (data.type === 'guild-joined') {
            // Show success notification
            toast.success(`Bot installed in ${data.guildName}!`, {
              description: 'The server list has been updated.',
              duration: 5000,
            });
            
            // Refresh the router to update the guild list
            console.log('[SSE] Refreshing page data...');
            router.refresh();
          }
        } catch (error) {
          console.error('[SSE] Failed to parse message:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        setConnectionStatus('error');
        eventSource.close();
        eventSourceRef.current = null;
        
        // Implement exponential backoff for reconnection
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/5)`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error('[SSE] Max reconnection attempts reached');
          setConnectionStatus('disconnected');
          
          // Show error notification after multiple failures
          toast.error('Real-time updates disconnected', {
            description: 'Please refresh the page to reconnect.',
          });
        }
      };
    };
    
    // Initial connection
    connect();
    
    // Cleanup function
    return () => {
      console.log('[SSE] Cleaning up connection');
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      setConnectionStatus('disconnected');
    };
  }, [pathname, router]);
  
  // Optional: Visual indicator for connection status (can be removed if not needed)
  if (pathname !== '/guilds' || connectionStatus === 'connected') {
    return null;
  }
  
  // Show a subtle connection indicator during connection issues
  if (connectionStatus === 'connecting' || connectionStatus === 'error') {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center gap-2 rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-800 shadow-sm">
          {connectionStatus === 'connecting' ? (
            <>
              <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-600" />
              <span>Connecting to real-time updates...</span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-red-600" />
              <span>Connection lost. Retrying...</span>
            </>
          )}
        </div>
      </div>
    );
  }
  
  return null;
}