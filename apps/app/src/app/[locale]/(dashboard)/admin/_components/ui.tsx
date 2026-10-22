"use client";

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
    <section className="flex w-full flex-col rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-5">
        <div className="flex max-w-2xl flex-col gap-1">
          <h2 className="text-lg font-medium text-primary">{title}</h2>
          {description && (
            <p className="text-sm text-primary/60">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      <div className="flex flex-col gap-4 px-6 py-5">{children}</div>
    </section>
  );
}

const tones = {
  neutral: "bg-primary/5 text-primary/70",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  danger: "bg-red-500/10 text-red-700 dark:text-red-300",
};

export type Tone = keyof typeof tones;

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export const manufacturerTone: Record<string, Tone> = {
  new: "neutral",
  review: "warning",
  approved: "info",
  contacted: "info",
  replied: "success",
  norms_received: "success",
  declined: "danger",
  excluded: "danger",
};

export const messageTone: Record<string, Tone> = {
  draft: "warning",
  approved: "info",
  rejected: "neutral",
  sent: "success",
};

export const jobTone: Record<string, Tone> = {
  queued: "neutral",
  running: "info",
  needs_review: "warning",
  succeeded: "success",
  failed: "danger",
};

export const importTone: Record<string, Tone> = {
  queued: "neutral",
  extracting: "info",
  review: "warning",
  failed: "danger",
};

export const confidenceTone: Record<string, Tone> = {
  high: "success",
  medium: "warning",
  low: "danger",
};

export const levelTone: Record<string, Tone> = {
  error: "danger",
  warning: "warning",
  info: "neutral",
};

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

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
  return <select className={cn(fieldClass, "h-10", className)} {...props} />;
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
      <label htmlFor={htmlFor} className="text-sm font-medium text-primary/80">
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
    <p className="text-sm text-red-700 dark:text-red-300" role="alert">
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
      className="break-all text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
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
          className="flex items-start gap-2 text-sm text-primary/80"
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
