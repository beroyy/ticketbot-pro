"use client";

import { useEffect } from "react";
import { useDialogStore, selectCurrentDialog } from "@/stores/dialog-store";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const current = useDialogStore(selectCurrentDialog);
  const dismiss = useDialogStore((state) => state.dismiss);
  const resolveDialog = useDialogStore((state) => state._resolveDialog);

  // Handle escape key
  useEffect(() => {
    if (!current) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && current.options?.closeOnEscape !== false) {
        dismiss(current.id);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [current, dismiss]);

  // Render nothing if no dialog
  if (!current) {
    return <>{children}</>;
  }

  // Render custom dialog
  if (current.type === "dialog") {
    return (
      <>
        {children}
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open) dismiss(current.id);
          }}
        >
          <DialogContent
            className={cn(
              current.options?.size === "sm" && "sm:max-w-md",
              current.options?.size === "lg" && "sm:max-w-2xl",
              current.options?.size === "xl" && "sm:max-w-4xl",
              current.options?.size === "full" && "sm:max-w-full",
              current.options?.className
            )}
            showCloseButton={current.options?.showCloseButton}
            onInteractOutside={(e) => {
              if (current.options?.closeOnOverlayClick === false) {
                e.preventDefault();
              }
            }}
          >
            {current.content}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Render alert dialog
  if (current.type === "alert" || current.type === "confirm") {
    const isConfirm = current.type === "confirm";
    const options = current.alertOptions!;

    return (
      <>
        {children}
        <AlertDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) resolveDialog(current.id, false);
          }}
        >
          <AlertDialogContent className={options.className}>
            <AlertDialogHeader>
              <AlertDialogTitle>{options.title}</AlertDialogTitle>
              {options.description && (
                <AlertDialogDescription>{options.description}</AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              {isConfirm && (
                <AlertDialogCancel
                  onClick={() => resolveDialog(current.id, false)}
                >
                  {(options as any).cancelText || "Cancel"}
                </AlertDialogCancel>
              )}
              <AlertDialogAction
                onClick={() => resolveDialog(current.id, true)}
                className={cn(
                  options.variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                )}
              >
                {options.confirmText || "OK"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return <>{children}</>;
}