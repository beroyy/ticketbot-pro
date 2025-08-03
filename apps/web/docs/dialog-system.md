# Dialog System

A global dialog management system inspired by Sonner's toast API, providing imperative control over dialogs and alert dialogs.

## Overview

The dialog system consists of:
- **Dialog Store** - Zustand store managing dialog state and queue
- **Dialog Provider** - React component rendering active dialogs
- **Dialog Controller** - Imperative API for showing/dismissing dialogs

## Usage

### Basic Dialog

```tsx
import { dialog } from "@/lib/dialog";

// Show custom content
dialog("Hello World");
dialog(<CustomComponent />);

// With options
dialog(<MyForm />, {
  size: "lg",
  showCloseButton: false,
  closeOnEscape: false,
});
```

### Alert Dialog

```tsx
// Simple alert
await dialog.alert({
  title: "Success!",
  description: "Your changes have been saved.",
});

// With custom button text
await dialog.alert({
  title: "Error",
  description: "Something went wrong.",
  confirmText: "Got it",
  variant: "destructive",
});
```

### Confirmation Dialog

```tsx
const confirmed = await dialog.confirm({
  title: "Delete Item?",
  description: "This action cannot be undone.",
  confirmText: "Delete",
  cancelText: "Cancel",
  variant: "destructive",
});

if (confirmed) {
  // User clicked confirm
  await deleteItem();
}
```

### Helper Methods

```tsx
// Success alert
await dialog.success({
  title: "Item created",
  description: "Your new item has been created successfully.",
});

// Error alert
await dialog.error({
  title: "Failed to save",
  description: "Please check your input and try again.",
});

// Promise handling
const result = await dialog.promise(
  fetchData(),
  {
    loading: <LoadingSpinner />,
    success: (data) => ({
      title: "Data loaded",
      description: `Loaded ${data.length} items`,
    }),
    error: (err) => ({
      title: "Failed to load",
      description: err.message,
    }),
  }
);
```

### Dismissing Dialogs

```tsx
// Dismiss current dialog
dialog.dismiss();

// Dismiss specific dialog by ID
const id = dialog("Processing...");
dialog.dismiss(id);

// Dismiss all dialogs
dialog.dismissAll();
```

## Dialog Options

```typescript
interface DialogOptions {
  size?: "sm" | "default" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}
```

## Integration Example

The dialog system is integrated with SSE events to show confirmations:

```tsx
useSSEEvent("guild-joined", async (event) => {
  const confirmed = await dialog.confirm({
    title: "Bot Successfully Installed!",
    description: `${event.guildName} has been added. Configure it now?`,
    confirmText: "Configure Now",
    cancelText: "Later",
  });
  
  if (confirmed) {
    router.push(`/g/${event.guildId}/settings`);
  }
});
```

## Architecture

1. **Queue Management**: Multiple dialogs are queued and shown sequentially
2. **Promise-Based**: Alert and confirm dialogs return promises
3. **Type-Safe**: Full TypeScript support with proper types
4. **Accessible**: Proper focus management and keyboard support
5. **Animated**: Smooth transitions using Tailwind CSS animations

## Best Practices

1. Use `dialog.confirm()` for destructive actions
2. Keep dialog content concise and focused
3. Always provide clear action buttons
4. Use appropriate sizes for content
5. Handle promise rejections when using async dialogs