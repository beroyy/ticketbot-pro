import { useDialogStore } from "@/stores/dialog-store";
import type { ReactNode } from "react";
import type { DialogOptions, AlertOptions, ConfirmOptions } from "@/stores/dialog-store";

/**
 * Dialog controller API
 * 
 * Usage:
 * ```ts
 * // Show a custom dialog
 * dialog("Hello World")
 * dialog(<CustomComponent />)
 * 
 * // Show an alert
 * await dialog.alert({
 *   title: "Success!",
 *   description: "Your changes have been saved."
 * })
 * 
 * // Show a confirmation
 * const confirmed = await dialog.confirm({
 *   title: "Are you sure?",
 *   description: "This action cannot be undone.",
 *   variant: "destructive"
 * })
 * ```
 */
export const dialog = (content: ReactNode, options?: DialogOptions) => {
  return useDialogStore.getState().show(content, options);
};

dialog.show = dialog;

dialog.alert = (options: AlertOptions) => {
  return useDialogStore.getState().alert(options);
};

dialog.confirm = (options: ConfirmOptions) => {
  return useDialogStore.getState().confirm(options);
};

dialog.dismiss = (id?: string) => {
  return useDialogStore.getState().dismiss(id);
};

dialog.dismissAll = () => {
  return useDialogStore.getState().dismissAll();
};

// Custom dialog helpers
dialog.custom = (options: {
  content: ReactNode;
  size?: DialogOptions["size"];
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}) => {
  const { content, ...dialogOptions } = options;
  return useDialogStore.getState().show(content, dialogOptions);
};

// Success helper
dialog.success = (options: AlertOptions) => {
  return useDialogStore.getState().alert({
    ...options,
    title: `✓ ${options.title}`,
  });
};

// Error helper
dialog.error = (options: AlertOptions) => {
  return useDialogStore.getState().alert({
    ...options,
    title: `✗ ${options.title}`,
    variant: "destructive",
  });
};

// Promise helper - using function declaration for better TypeScript support
dialog.promise = async function <T>(
  promise: Promise<T>,
  options: {
    loading?: ReactNode;
    success?: (data: T) => AlertOptions;
    error?: (error: any) => AlertOptions;
  }
): Promise<T> {
  const id = dialog.show(
    options.loading || (
      <div className="flex items-center gap-2">
        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Loading...</span>
      </div>
    ),
    { showCloseButton: false, closeOnOverlayClick: false }
  );

  try {
    const result = await promise;
    dialog.dismiss(id);

    if (options.success) {
      await dialog.alert(options.success(result));
    }

    return result;
  } catch (error) {
    dialog.dismiss(id);

    if (options.error) {
      await dialog.alert(options.error(error));
    }

    throw error;
  }
};