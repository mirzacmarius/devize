"use node";

import Anthropic, {
  type AutoParseableOutputFormat,
  type ParsedMessage,
} from "@anthropic-ai/sdk";
import { env } from "../_generated/server";
import { usageOf } from "./messages";
import { type AiUsage, addUsage, emptyUsage } from "./pricing";

/** A failure the admin page explains: the job's `error` is this code. */
export class AiJobError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/** The Claude API client, with the key from the deployment's environment. */
export function claudeClient(): Anthropic {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new AiJobError("missing_api_key");
  }
  return new Anthropic({ apiKey, maxRetries: 4 });
}

/** Adds up what a job's requests cost, including the ones before a failure. */
export class UsageMeter {
  private usage: AiUsage = emptyUsage;

  add(message: Anthropic.Message) {
    this.usage = addUsage(this.usage, usageOf(message));
  }

  /** The usage not yet recorded. */
  get total(): AiUsage {
    return this.usage;
  }

  /** The usage not yet recorded, which then starts again from zero. */
  take(): AiUsage {
    const usage = this.usage;
    this.usage = emptyUsage;
    return usage;
  }
}

type Request = Omit<Anthropic.MessageStreamParams, "output_config" | "stream">;

type Run = {
  /** When to give up on a request, so the action can still save its work. */
  deadline: number;
  meter: UsageMeter;
};

function stream(
  client: Anthropic,
  request: Anthropic.MessageStreamParams,
  run: Run,
) {
  const timeout = Math.max(1_000, run.deadline - Date.now());
  return client.messages
    .stream(request, { signal: AbortSignal.timeout(timeout) })
    .finalMessage();
}

function checkStop(message: Anthropic.Message) {
  if (message.stop_reason === "refusal") {
    throw new AiJobError("refusal");
  }
  if (message.stop_reason === "max_tokens") {
    throw new AiJobError("max_tokens");
  }
}

/**
 * Runs one turn with server tools such as web search. The API pauses a long
 * turn; it is resumed until the model finishes, or until a minute before the
 * deadline, when the turn so far is returned.
 */
export async function runToolTurn(
  client: Anthropic,
  request: Request,
  run: Run,
): Promise<Anthropic.Message[]> {
  const responses: Anthropic.Message[] = [];
  const messages = [...request.messages];
  for (;;) {
    const response = await stream(client, { ...request, messages }, run);
    run.meter.add(response);
    responses.push(response);
    if (response.stop_reason === "refusal") {
      throw new AiJobError("refusal");
    }
    if (
      response.stop_reason !== "pause_turn" ||
      Date.now() > run.deadline - 60_000
    ) {
      return responses;
    }
    messages.push({ role: "assistant", content: response.content });
  }
}

/** Asks for JSON in the shape of `format` and returns it parsed. */
export async function structuredOutput<T>(
  client: Anthropic,
  request: Request,
  options: Run & {
    format: AutoParseableOutputFormat<T>;
    effort: "low" | "medium" | "high";
  },
): Promise<T> {
  const response = (await stream(
    client,
    {
      ...request,
      output_config: { format: options.format, effort: options.effort },
    },
    options,
  )) as ParsedMessage<T>;
  options.meter.add(response);
  checkStop(response);
  if (response.parsed_output === null || response.parsed_output === undefined) {
    throw new AiJobError("invalid_output");
  }
  return response.parsed_output;
}

/** The code stored on a failed job; the admin page explains the known ones. */
export function errorCode(error: unknown): string {
  if (error instanceof AiJobError) {
    return error.code;
  }
  if (
    error instanceof Anthropic.APIUserAbortError ||
    error instanceof Anthropic.APIConnectionTimeoutError
  ) {
    return "timeout";
  }
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  ) {
    return "api_key_rejected";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "rate_limited";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "api_unreachable";
  }
  if (error instanceof Anthropic.InternalServerError) {
    return "api_unavailable";
  }
  if (
    error instanceof Anthropic.APIError &&
    /credit balance/i.test(error.message)
  ) {
    return "no_credit";
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500) || "unknown";
}
