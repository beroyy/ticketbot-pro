# Next.js App Router Migration Plan

## Overview
This document outlines the complete migration plan from Pages Router to App Router for the TicketsBot web application. The migration focuses on leveraging server-side capabilities to eliminate complex client-side auth logic and improve overall UX.

## Core Architecture Decisions

### No Middleware Approach
- **Layout-Based Auth**: All authentication checks happen in server component layouts
- **Direct Database Access**: Full Node.js capabilities without Edge Runtime limitations
- **Performance**: Avoids middleware overhead on every request (including static assets)
- **Caching**: Next.js automatically caches and deduplicates layout data fetches

### Guild Context Strategy
- **Primary**: Guild ID in URL path (`/g/[guildId]/*`) for explicit context
- **Persistence**: HTTP-only cookie (`selectedGuild`) for maintaining selection
- **Sharing**: All URLs are shareable with guild context preserved
- **Switching**: Full page navigation when changing guilds (worth it for robustness)

### Authentication Flow
- **Server-Side**: All auth checks in server component layouts
- **No Loading States**: Instant redirects and permission checks
- **Better-Auth Integration**: Direct session validation using server-side APIs
- **No Middleware**: Avoiding Edge Runtime limitations and request overhead

### Permission System
- **Layout Guards**: Page-level permission checks in route layouts
- **Component Guards**: Granular permission checks with `RequirePermission` wrapper
- **Redirect Pattern**: Unauthorized access redirects with error messages in search params

## Implementation Phases

### Phase 1: Core Authentication & Routing Structure ✅

#### 1.1 Server-Side Auth Utilities (`lib/auth-server.ts`) ✅
- [x] `getServerSession()` - Get session using better-auth's server API with cookie headers
- [x] `requireAuth()` - Get session or throw error for use in pages/layouts
- [x] `getUserWithGuilds()` - Get user with cached Discord guilds data + bot installation status
- [x] Direct database/Redis access for session validation

#### 1.2 Guild Context Helpers (`lib/guild-context.ts`) ✅
- [x] `validateGuildAccess()` - Check bot installed and user has access to guild
- [x] `setSelectedGuild()` - Server action to update guild selection cookie
- [x] `getSelectedGuild()` - Read guild preference from cookie
- [x] `checkBotInstalled()` - Verify bot is in the guild

#### 1.3 Implement Route Structure ✅
```
/app
  /(public)
    /login/page.tsx              # Public login page
    layout.tsx                   # No auth checks
  /(authenticated)  
    layout.tsx                   # Auth check via getServerSession()
    /guilds/page.tsx             # Guild selector page
    /(guild)/g/[guildId]
      layout.tsx                 # Guild context validation
      /dashboard/page.tsx        # Dashboard
      /tickets/page.tsx          # Updated tickets page
```

### Phase 2: Server Component Permission Guards ✅

#### 2.1 Guild Layout with Permissions ✅
```typescript
// app/(guild)/g/[guildId]/layout.tsx
- [x] Fetch user session
- [x] Get user permissions for guild
- [x] Provide guild context to children
- [x] Handle missing permissions
```

#### 2.2 Permission Guard Components ✅
- [x] `components/guards/RequirePermission.tsx` - Server component permission wrapper
- [x] `components/guards/WithPermission.tsx` - Conditional rendering based on permissions
- [x] `components/guards/PermissionError.tsx` - Permission denied error component
- [x] `lib/permissions-server.ts` - Server-side permission utilities

### Phase 3: Navigation Components ✅

#### 3.1 Server-Side Navbar (`components/navbar.tsx`) ✅
- [x] Convert to server component
- [x] Read guild context from params
- [x] Filter navigation items by permissions
- [x] Include guild switcher dropdown
- [x] Active state styling via client-side NavItems component
- [x] Mobile menu integration with responsive design

#### 3.2 Guild Switcher (`components/guild-switcher.tsx`) ✅
- [x] Client component for interactivity
- [x] Display current guild with avatar
- [x] List available guilds with bot installation status
- [x] Handle guild switching (update cookie + navigate)
- [x] Visual indicators for bot installation (green bot icon)
- [x] Separate sections: "Your Servers", "Other Servers", "Install Bot"
- [x] Loading spinner while switching guilds
- [x] Search functionality for users with >5 guilds
- [x] "Install Bot" action with Discord OAuth redirect

#### 3.3 Mobile Navigation (`components/mobile-menu.tsx`) ✅
- [x] Responsive hamburger menu for mobile devices
- [x] Slide-out drawer with navigation items
- [x] Guild info display with switch server link
- [x] Active state highlighting
- [x] Backdrop overlay when menu is open

### Phase 4: Onboarding & Bot Integration

#### 4.1 Login Page (`app/(public)/login/page.tsx`) ✅
- [x] Server component with auth check
- [x] Discord OAuth sign-in button
- [x] Auto-redirect if already authenticated
- [x] Clean, no client-side effects

#### 4.2 Guild Selection Page (`app/(authenticated)/guilds/page.tsx`) ✅
- [x] List user's Discord guilds
- [x] Show bot installation status
- [x] "Install Bot" action for guilds without bot
- [x] "Select Guild" for guilds with bot
- [x] Server Action for guild selection (setSelectedGuild)

#### 4.3 Webhook Endpoints
- [ ] `/api/webhooks/bot/guild-joined/route.ts`
- [ ] `/api/webhooks/bot/guild-left/route.ts`
- [ ] `/api/webhooks/bot/setup-complete/route.ts`
- [ ] Webhook secret validation
- [ ] Database updates on events

#### 4.4 Bot Integration
- [ ] Configure bot to send webhooks using Sapphire fetch
- [ ] Add webhook secret to environment variables
- [ ] Test webhook flow end-to-end

### Phase 5: Update Existing Features

#### 5.1 Migrate Tickets System ✅
- [x] Move tickets to `/g/[guildId]/tickets`
- [x] Update to use `params.guildId` instead of hardcoded
- [x] Remove guild selection from queries (use context)
- [x] Update API client to include guild context

#### 5.2 Implement Dashboard ⚠️ (Partially Complete)
- [x] Create dashboard at `/g/[guildId]/dashboard`
- [x] Server-side data fetching
- [x] Permission-based widget visibility
- [ ] Analytics and stats display (placeholders only)

## Key Implementation Patterns

### Layout Authentication Pattern
```typescript
// app/(authenticated)/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';

export default async function AuthenticatedLayout({ children }) {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }
  return <>{children}</>;
}
```

### Guild Access Validation Pattern
```typescript
// app/(authenticated)/(guild)/g/[guildId]/layout.tsx
export default async function GuildLayout({ params, children }) {
  const session = await getServerSession();
  if (!session) redirect('/login');
  
  const hasAccess = await validateGuildAccess(session.user.id, params.guildId);
  if (!hasAccess) {
    redirect('/guilds?error=no-access');
  }
  
  return <>{children}</>;
}
```

### Server Action Pattern
```typescript
// For guild selection persistence
async function setSelectedGuild(guildId: string) {
  'use server';
  const cookieStore = await cookies();
  cookieStore.set('selectedGuild', guildId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });
  redirect(`/g/${guildId}/dashboard`);
}
```

### Permission Check Pattern
```typescript
// In server components/pages
const permissions = await getUserPermissions(params.guildId);
if (!permissions.has(PermissionFlags.TICKET_VIEW_ALL)) {
  redirect(`/g/${params.guildId}/dashboard?error=no-permission`);
}
```

## Why No Middleware?

We chose to implement authentication in layouts rather than middleware for several reasons:

1. **Performance**: Middleware runs on every request including static assets (CSS, JS, images)
2. **Edge Runtime Limitations**: Middleware runs in Edge Runtime with limited Node.js APIs
3. **Direct Database Access**: Layouts run in Node.js with full database/Redis access
4. **Caching**: Next.js automatically caches and deduplicates layout data fetches
5. **Simplicity**: Single auth check location per route group

The minor trade-off (no auth check until route render begins) is acceptable for an admin dashboard where all routes require authentication.

## Benefits of This Architecture

1. **No Loading Spinners**: Server-side auth/permission checks
2. **Shareable URLs**: Guild context always in URL
3. **Better Performance**: No middleware overhead, aggressive caching
4. **Simpler Code**: No complex client-side auth state
5. **Better UX**: Instant navigation, no auth delays
6. **SEO Friendly**: Full server-side rendering
7. **Direct DB Access**: Full Node.js capabilities in layouts

## Migration Checklist

- [x] Phase 1: Core auth and routing ✅
- [x] Phase 2: Permission guards ✅
- [x] Phase 3: Navigation components ✅
- [x] Phase 4: Onboarding flow (4.1 & 4.2 complete, 4.3 & 4.4 pending)
- [x] Phase 5: Feature migration (Tickets ✅, Dashboard ⚠️)
- [ ] Testing: End-to-end user flows
- [ ] Cleanup: Remove legacy code

## Environment Variables Needed

```env
# Existing
BETTER_AUTH_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...

# New
BOT_WEBHOOK_SECRET=<shared-secret-with-bot>
NEXT_PUBLIC_DISCORD_CLIENT_ID=<discord-app-client-id> # For bot installation
```

## Additional Features Implemented

Beyond the original migration plan, several enhancements were added:

### Enhanced Guild Switcher
- **Search Functionality**: Filter guilds when user has more than 5 servers
- **Categorized Display**: Three sections - "Your Servers", "Other Servers", "Install Bot"
- **Visual Indicators**: Green bot icon for installed guilds
- **Loading States**: Spinner during guild switching
- **Smooth Transitions**: Optimistic updates with proper error handling

### Mobile-First Navigation
- **Responsive Design**: Hamburger menu for mobile devices
- **Slide-Out Drawer**: Full navigation in mobile view
- **Backdrop Overlay**: Proper mobile UX with dismissible menu
- **Touch Optimized**: Large tap targets and smooth animations

### User Experience Improvements
- **User Menu**: Profile dropdown with sign-out functionality
- **Stable Avatars**: Consistent avatar display with loading states
- **Permission Errors**: Graceful handling of permission failures
- **Active State Management**: Visual indicators for current page

### Developer Experience
- **Server Utilities**: Comprehensive permission checking helpers
- **Type Safety**: Full TypeScript coverage with proper types
- **Error Boundaries**: Graceful error handling throughout

## Implementation Details for New Components

### `components/guards/RequirePermission.tsx`
Server component that wraps content requiring specific permissions. Redirects to dashboard with error message if permission check fails.

### `components/guards/WithPermission.tsx`
Conditionally renders children based on permission check. Shows fallback content or nothing if permissions are insufficient.

### `components/stable-avatar.tsx`
Prevents avatar flicker during navigation by maintaining consistent rendering. Handles both user and guild avatars with proper fallbacks.

### `components/user-menu.tsx`
Dropdown menu showing user info with sign-out functionality. Integrates with better-auth for session management.

### `lib/permissions-server.ts`
Server-side utilities for checking user permissions within guild context. Includes helpers for common permission patterns.

## Next Steps

1. Phase 1-3 are complete ✅
2. Phase 4.1 & 4.2 are complete ✅
3. Focus on remaining Phase 4 items:
   - 4.3: Webhook Endpoints
   - 4.4: Bot Integration
4. Complete Phase 5.2: Full analytics implementation
5. Begin testing and cleanup phases

This migration has successfully modernized the application with server-side rendering, improved performance, and enhanced user experience.