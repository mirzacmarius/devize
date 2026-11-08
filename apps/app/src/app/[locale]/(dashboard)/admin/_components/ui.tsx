"use client";

import { StatusPill, type StatusPillProps } from "@devize/ui/status-pill";
import { cn } from "@devize/ui/utils";
import { ConvexError } from "convex/values";
import {
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useState,
} from "react";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

// Small building blocks shared by the admin pages.

export function Panel({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      data-slot="card"
      className="flex w-full min-w-0 flex-col rounded-lg border border-card-border bg-card shadow-card"
    >
      <div
        data-slot="card-header"
        className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3.5 pt-4 sm:px-5"
      >
        <div className="flex max-w-2xl flex-col gap-0.5">
          <h2 className="m-0 text-title-card text-ink">{title}</h2>
          {description && (
            <p className="m-0 text-meta text-ink-3">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      <div
        data-slot="card-content"
        className="flex flex-col gap-4 px-4 pb-5 sm:px-5"
      >
        {children}
      </div>
    </section>
  );
}

export type Tone = NonNullable<StatusPillProps["tone"]>;

export const Pill = StatusPill;

/** How much research trusts a finding: worth a glance, never an alarm. */
export function Confidence({
  level,
  children,
}: {
  // With it, three bars say it at a glance, as a signal's do.
  level?: "high" | "medium" | "low";
  children: ReactNode;
}) {
  const bars = level === "high" ? 3 : level === "medium" ? 2 : 1;
  return (
    <span className="inline-flex items-baseline gap-2 whitespace-nowrap text-meta text-ink-2">
      {level && (
        <span
          aria-hidden
          className="inline-flex h-3 items-end gap-0.5 self-center"
        >
          {["h-1.5", "h-[9px]", "h-3"].map((height, step) => (
            <span
              key={height}
              className={cn(
                "w-1 rounded-[1px]",
                height,
                step < bars ? "bg-ink-2" : "bg-tick",
              )}
            />
          ))}
        </span>
      )}
      {children}
    </span>
  );
}

export const manufacturerTone: Record<string, Tone> = {
  new: "draft",
  review: "warning",
  approved: "active",
  contacted: "active",
  replied: "success",
  norms_received: "success",
  declined: "declined",
  excluded: "neutral",
};

export const messageTone: Record<string, Tone> = {
  draft: "draft",
  approved: "active",
  rejected: "neutral",
  sent: "success",
};

export const jobTone: Record<string, Tone> = {
  queued: "neutral",
  running: "active",
  needs_review: "warning",
  succeeded: "success",
  failed: "danger",
};

export const importTone: Record<string, Tone> = {
  queued: "neutral",
  extracting: "active",
  review: "warning",
  failed: "danger",
};

export const levelTone: Record<string, Tone> = {
  error: "danger",
  warning: "warning",
  info: "neutral",
};

const fieldClass =
  "w-full rounded-md border border-input border-b-edge bg-field px-3 py-2 text-body text-ink transition-[border-color,box-shadow] hover:border-edge placeholder:text-ink-3 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/0.2)] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:text-ink-3";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, className)} {...props} />;
}

export function NativeSelect({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(fieldClass, "select-native h-9 py-0 pr-8", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-body text-ink-2">
        {label}
      </label>
      {children}
    </div>
  );
}

const errorCodes = [
  "forbidden",
  "not_found",
  "already_running",
  "blocked",
  "not_editable",
  "not_approved",
  "invalid",
  "in_use",
  "not_pdf",
  "file_too_large",
  "missing_api_key",
  "api_key_rejected",
  "rate_limited",
  "api_unreachable",
  "api_unavailable",
  "no_credit",
  "timeout",
  "refusal",
  "max_tokens",
  "invalid_output",
  "no_articles",
  "suppressed",
  "already_claimed",
  "unknown",
] as const;

type ErrorCode = (typeof errorCodes)[number];

function isErrorCode(code: string): code is ErrorCode {
  return (errorCodes as readonly string[]).includes(code);
}

/** Explains an error code from a mutation or a failed job. */
export function useErrorText() {
  const t = useScopedI18n("admin.errors");
  return (code: string | undefined, detail?: string) => {
    if (!code) {
      return t("unknown");
    }
    // Publishing names the imported row it couldn't publish.
    if (code === "invalid" && detail?.startsWith("importedNorm.")) {
      return t("invalidNorm", { code: detail.slice("importedNorm.".length) });
    }
    if (code === "invalid" && detail === "consent") {
      return t("missingConsent");
    }
    return isErrorCode(code) ? t(code) : code;
  };
}

/**
 * Runs a mutation from a button and keeps its error to show next to it. The
 * server's ConvexError codes are explained; anything else is "unknown".
 */
export function useRun() {
  const errorText = useErrorText();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    setPending(true);
    try {
      await action();
      return true;
    } catch (caught) {
      const data = caught instanceof ConvexError ? caught.data : undefined;
      const code =
        data && typeof data === "object" && "code" in data
          ? String(data.code)
          : undefined;
      const detail =
        data && typeof data === "object" && "detail" in data
          ? String(data.detail)
          : undefined;
      setError(errorText(code, detail));
      return false;
    } finally {
      setPending(false);
    }
  };
  return { run, error, pending };
}

export function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p className="text-body text-danger" role="alert">
      {error}
    </p>
  ) : null;
}

export function useFormat() {
  const locale = useCurrentLocale();
  const tag = locale === "ro" ? "ro-RO" : "en-GB";
  const money = (value: number) =>
    new Intl.NumberFormat(tag, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  return {
    date: (timestamp: number) =>
      new Intl.DateTimeFormat(tag, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(timestamp),
    number: (value: number) =>
      new Intl.NumberFormat(tag, { maximumFractionDigits: 4 }).format(value),
    usd: money,
    lei: money,
    // A change as a fraction, signed: 0.035 is "+3,5 %".
    change: (fraction: number) =>
      new Intl.NumberFormat(tag, {
        style: "percent",
        maximumFractionDigits: 1,
        signDisplay: "exceptZero",
      }).format(fraction),
  };
}

/** A link to a page research found; anything but http(s) stays plain text. */
export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children?: ReactNode;
}) {
  if (!/^https?:\/\//i.test(href.trim())) {
    return <span className="break-all">{children ?? href}</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="break-all text-ink underline decoration-ink-3/50 underline-offset-[4px] hover:decoration-current"
    >
      {children ?? href}
    </a>
  );
}

const issueCodes = [
  "empty_subject",
  "placeholder",
  "missing_optout",
  "missing_signature",
  "banned_phrase",
  "word_limit",
  "cedilla",
  "missing_recipient",
  "invalid_recipient",
  "suppressed_recipient",
  "unverified_recipient",
  "recipient_other_domain",
  "claim_link_mismatch",
  "already_claimed",
  "missing_controller",
  "no_resources",
  "quantity_invalid",
  "unit_unknown",
  "labor_sum",
  "no_labor",
];

/** Explains a problem found in a draft or an extracted norm. */
export function useIssueText() {
  // Some messages take the issue's detail and some don't; all get it.
  const t = useScopedI18n("admin.issues") as unknown as (
    key: string,
    params: { detail: string },
  ) => string;
  return (issue: { code: string; detail?: string }) =>
    issueCodes.includes(issue.code)
      ? t(issue.code, { detail: issue.detail ?? "" })
      : [issue.code, issue.detail].filter(Boolean).join(": ");
}

export function IssueList({
  issues,
}: {
  issues: { code: string; level: string; detail?: string }[];
}) {
  const issueText = useIssueText();
  const t = useScopedI18n("admin.level");
  return (
    <ul className="flex flex-col gap-1.5">
      {issues.map((issue) => (
        <li
          key={`${issue.code}-${issue.detail ?? ""}`}
          className="flex items-start gap-2 text-body text-ink-2"
        >
          <Pill tone={levelTone[issue.level] ?? "neutral"}>
            {issue.level === "error" || issue.level === "warning"
              ? t(issue.level)
              : t("info")}
          </Pill>
          <span>{issueText(issue)}</span>
        </li>
      ))}
    </ul>
  );
}
