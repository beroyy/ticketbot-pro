import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { ReactNode } from "react";

export interface DialogOptions {
  size?: "sm" | "default" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

export interface AlertOptions {
  title: string;
  description?: string;
  confirmText?: string;
  variant?: "default" | "destructive";
  className?: string;
}

export interface ConfirmOptions extends AlertOptions {
  cancelText?: string;
}

export interface DialogItem {
  id: string;
  type: "dialog" | "alert" | "confirm";
  content?: ReactNode;
  options?: DialogOptions;
  alertOptions?: AlertOptions | ConfirmOptions;
  promise?: {
    resolve: (value: boolean) => void;
    reject: (reason?: any) => void;
  };
}

interface DialogStore {
  current: DialogItem | null;
  queue: DialogItem[];

  // Actions
  show: (content: ReactNode, options?: DialogOptions) => string;
  alert: (options: AlertOptions) => Promise<boolean>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  dismiss: (id?: string) => void;
  dismissAll: () => void;

  // Internal
  _processQueue: () => void;
  _resolveDialog: (id: string, value: boolean) => void;
}

export const useDialogStore = create<DialogStore>()(
  devtools(
    immer((set, get) => ({
      current: null,
      queue: [],

      show: (content, options) => {
        const id = nanoid();
        const dialog: DialogItem = {
          id,
          type: "dialog",
          content,
          options: {
            showCloseButton: true,
            closeOnEscape: true,
            closeOnOverlayClick: true,
            ...options,
          },
        };

        set((state) => {
          if (!state.current) {
            state.current = dialog;
          } else {
            state.queue.push(dialog);
          }
        });

        return id;
      },

      alert: (alertOptions) => {
        return new Promise<boolean>((resolve, reject) => {
          const id = nanoid();
          const dialog: DialogItem = {
            id,
            type: "alert",
            alertOptions: {
              confirmText: "OK",
              ...alertOptions,
            },
            promise: { resolve, reject },
          };

          set((state) => {
            if (!state.current) {
              state.current = dialog;
            } else {
              state.queue.push(dialog);
            }
          });
        });
      },

      confirm: (confirmOptions) => {
        return new Promise<boolean>((resolve, reject) => {
          const id = nanoid();
          const dialog: DialogItem = {
            id,
            type: "confirm",
            alertOptions: {
              confirmText: "Confirm",
              cancelText: "Cancel",
              ...confirmOptions,
            },
            promise: { resolve, reject },
          };

          set((state) => {
            if (!state.current) {
              state.current = dialog;
            } else {
              state.queue.push(dialog);
            }
          });
        });
      },

      dismiss: (id) => {
        const current = get().current;

        if (!id || current?.id === id) {
          // Dismiss current dialog
          if (current?.promise) {
            current.promise.resolve(false);
          }

          set((state) => {
            state.current = null;
          });

          // Process queue after a small delay for animation
          setTimeout(() => {
            get()._processQueue();
          }, 200);
        } else {
          // Remove from queue
          set((state) => {
            state.queue = state.queue.filter((d) => d.id !== id);
          });
        }
      },

      dismissAll: () => {
        const { current, queue } = get();

        // Resolve all promises as false
        if (current?.promise) {
          current.promise.resolve(false);
        }
        queue.forEach((dialog) => {
          if (dialog.promise) {
            dialog.promise.resolve(false);
          }
        });

        set((state) => {
          state.current = null;
          state.queue = [];
        });
      },

      _processQueue: () => {
        set((state) => {
          if (!state.current && state.queue.length > 0) {
            state.current = state.queue.shift() || null;
          }
        });
      },

      _resolveDialog: (id, value) => {
        const current = get().current;

        if (current?.id === id) {
          if (current.promise) {
            current.promise.resolve(value);
          }

          set((state) => {
            state.current = null;
          });

          // Process queue after animation
          setTimeout(() => {
            get()._processQueue();
          }, 200);
        }
      },
    })),
    {
      name: "dialog-store",
    }
  )
);

// Selectors
export const selectCurrentDialog = (state: DialogStore) => state.current;
export const selectDialogQueue = (state: DialogStore) => state.queue;
export const selectHasDialog = (state: DialogStore) => state.current !== null;