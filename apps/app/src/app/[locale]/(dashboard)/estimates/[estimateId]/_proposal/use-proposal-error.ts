"use client";

import { useCallback } from "react";
import { useErrorMessage } from "@/components/use-error-message";
import { appErrorOf } from "@/lib/errors";
import { useScopedI18n } from "@/locales/client";

/** Like useErrorMessage, with what only proposals refuse: too many, or one already running. */
export function useProposalError() {
  const t = useScopedI18n("proposal");
  const errorMessage = useErrorMessage();
  return useCallback(
    (error: unknown) => {
      const appError = appErrorOf(error);
      if (appError?.code === "rate_limited") {
        return t("errors.rateLimited");
      }
      if (appError?.code === "in_use" && appError.detail === "proposal") {
        return t("errors.inUse");
      }
      return errorMessage(error);
    },
    [t, errorMessage],
  );
}

// Why an AI job failed, from the code it stored, as the sheet explains it.
const failureReasons = {
  missing_api_key: "missingKey",
  api_key_rejected: "keyRejected",
  no_credit: "noCredit",
  timeout: "timeout",
  rate_limited: "busy",
  api_unreachable: "busy",
  api_unavailable: "busy",
  refusal: "refusal",
  max_tokens: "incomplete",
  invalid_output: "incomplete",
} as const;

export type FailureReason =
  | (typeof failureReasons)[keyof typeof failureReasons]
  | "unknown";

export function failureReason(code: string | undefined): FailureReason {
  return (
    (code && failureReasons[code as keyof typeof failureReasons]) || "unknown"
  );
}
