"use client";

import { toast } from "@devize/ui/sonner";
import { useCallback } from "react";
import { useErrorMessage } from "./use-error-message";

export type RunResult<T> = { ok: true; value: T } | { ok: false };

/**
 * Runs a mutation and shows a toast when it fails, so forms only handle the
 * success: close the dialog, go to the new page. A success message is optional.
 */
export function useRun() {
  const errorMessage = useErrorMessage();
  return useCallback(
    async <T>(
      action: () => Promise<T>,
      success?: string,
    ): Promise<RunResult<T>> => {
      try {
        const value = await action();
        if (success) {
          toast.success(success);
        }
        return { ok: true, value };
      } catch (error) {
        toast.error(errorMessage(error));
        return { ok: false };
      }
    },
    [errorMessage],
  );
}
