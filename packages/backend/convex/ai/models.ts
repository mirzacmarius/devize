import { env } from "../_generated/server";

export const defaultModel = "claude-opus-5-5";

/**
 * The model for new AI jobs. AI_MODEL in the deployment's environment
 * overrides it, for example with a smaller model to spend less.
 */
export function aiModel(): string {
  return env.AI_MODEL?.trim() || defaultModel;
}
