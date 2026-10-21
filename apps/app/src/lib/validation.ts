import { cleanCui } from "@devize/backend/convex/accounts/identifiers";

/** Whether a CUI passes the control-digit check the backend applies, with or without "RO". */
export function isValidCui(value: string): boolean {
  try {
    cleanCui(value);
    return true;
  } catch {
    return false;
  }
}
