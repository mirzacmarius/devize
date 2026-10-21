import { ConvexError } from "convex/values";

/**
 * The code and detail of an error a Convex function threw on purpose
 * (`ConvexError({ code, detail })`, see convex/lib/errors.ts), or undefined
 * for anything else, such as a network failure.
 */
export function appErrorOf(
  error: unknown,
): { code: string; detail?: string } | undefined {
  if (!(error instanceof ConvexError)) {
    return undefined;
  }
  const data: unknown = error.data;
  if (typeof data !== "object" || data === null || !("code" in data)) {
    return undefined;
  }
  const { code, detail } = data as { code: unknown; detail?: unknown };
  return {
    code: String(code),
    detail: typeof detail === "string" ? detail : undefined,
  };
}
