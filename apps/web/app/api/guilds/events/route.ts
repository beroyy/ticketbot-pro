import { getServerSession } from "@/lib/auth-server";
import { botEvents, type SSEEvent } from "@/lib/sse/bot-events";

// Force dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

// Disable runtime edge to use Node.js EventEmitter
export const runtime = 'nodejs';

/**
 * GET /api/guilds/events
 * 
 * Server-Sent Events endpoint for real-time bot event updates
 * Requires authentication
 */
export async function GET(request: Request) {
  // Authenticate the SSE connection
  const session = await getServerSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const userId = session.user.id;
  console.log(`[SSE] Establishing connection for user ${userId}`);
  
  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Helper to send SSE messages
      const send = (data: string) => {
        controller.enqueue(encoder.encode(data));
      };
      
      // Send initial connection message
      send('data: {"type":"connected"}\n\n');
      
      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          send(':heartbeat\n\n');
        } catch (error) {
          // Connection closed, cleanup will happen in abort handler
          console.error('[SSE] Heartbeat failed:', error);
        }
      }, 30000); // Every 30 seconds
      
      // Subscribe to events the user is authorized to see
      const handleEvent = (event: SSEEvent) => {
        try {
          const data = JSON.stringify(event);
          send(`data: ${data}\n\n`);
          console.log(`[SSE] Sent event to user ${userId}:`, event.type);
        } catch (error) {
          console.error('[SSE] Failed to send event:', error);
        }
      };
      
      // TODO: Implement guild filtering based on user permissions
      // For now, subscribe only to user-specific events
      // In production, we should:
      // 1. Get user's Discord ID from Better Auth
      // 2. Query all guilds where user is owner or team member
      // 3. Subscribe to those guild channels as well
      
      const unsubscribe = botEvents.subscribeToUserEvents(userId, handleEvent);
      
      // Cleanup on client disconnect
      const cleanup = () => {
        console.log(`[SSE] Cleaning up connection for user ${userId}`);
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch (_error) {
          // Controller might already be closed
        }
      };
      
      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);
    },
  });
  
  // Return SSE response with appropriate headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
      'Access-Control-Allow-Origin': process.env.WEB_URL || '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}