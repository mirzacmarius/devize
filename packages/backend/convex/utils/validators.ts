import { z } from "zod";

/** 3–32 letters or digits, stored in lower case. Spaces around it are ignored. */
export const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(32)
  .regex(/^[a-z0-9]+$/, "Username may only contain alphanumeric characters.");
