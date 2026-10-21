import { ConvexError } from "convex/values";

// Errors the app shows to people. The interface translates `code`; `detail`
// carries the values, such as a field name.
export type ErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid"
  | "locked"
  | "in_use"
  | "rate_limited";

export function appError(code: ErrorCode, detail?: string) {
  return new ConvexError(detail === undefined ? { code } : { code, detail });
}

export const notFound = (detail?: string) => appError("not_found", detail);
export const forbidden = (detail?: string) => appError("forbidden", detail);
export const invalid = (detail: string) => appError("invalid", detail);
