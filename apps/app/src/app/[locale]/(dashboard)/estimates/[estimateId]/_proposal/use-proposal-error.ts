"use client";

import { MAX_TENDER_FILES } from "@devize/backend/convex/proposals/lib/input";
import { useCallback } from "react";
import { useErrorMessage } from "@/components/use-error-message";
import { appErrorOf } from "@/lib/errors";
import { useScopedI18n } from "@/locales/client";

/**
 * Like useErrorMessage, with what only proposals refuse: too many, one
 * already running, or a tender's files.
 */
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
      if (appError?.code === "invalid") {
        switch (appError.detail) {
          case "xls":
            return t("errors.xls");
          case "fileType":
            return t("errors.fileType");
          case "files":
            return t("errors.files", { max: MAX_TENDER_FILES });
          case "size":
            return t("errors.size");
        }
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

// A tender import's lists are split, not its photos or description.
const tenderReasons = {
  timeout: "tenderTimeout",
  incomplete: "tenderIncomplete",
} as const;

export type FailureReason =
  | (typeof failureReasons)[keyof typeof failureReasons]
  | (typeof tenderReasons)[keyof typeof tenderReasons]
  | "unknown";

export function failureReason(
  code: string | undefined,
  source: "description" | "tender" = "description",
): FailureReason {
  const reason =
    (code && failureReasons[code as keyof typeof failureReasons]) || "unknown";
  if (source === "tender" && reason in tenderReasons) {
    return tenderReasons[reason as keyof typeof tenderReasons];
  }
  return reason;
}
