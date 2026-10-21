import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    /** The product app, where "Intră în aplicație" leads. */
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  // Skipping also skips the default above, so only skip when asked to.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
