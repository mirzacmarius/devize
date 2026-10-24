"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button, buttonVariants } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { cn } from "@devize/ui/utils";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { useScopedI18n } from "@/locales/client";
import { gmailComposeUrl, mailtoUrl } from "../_components/email-links";
import { ErasureRow } from "../_components/erasure-row";
import {
  confidenceTone,
  ErrorText,
  messageTone,
  Panel,
  Pill,
  useRun,
} from "../_components/ui";

type QueuedMessage = FunctionReturnType<
  typeof api.manufacturers.outreach.queue
>[number];

type Readiness = FunctionReturnType<
  typeof api.manufacturers.outreach.readiness
>;

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

export default function OutreachPage() {
  const t = useScopedI18n("admin.outreach");
  const messages = useQuery(api.manufacturers.outreach.queue);
  const readiness = useQuery(api.manufacturers.outreach.readiness);
  const mailbox = useQuery(api.manufacturers.retention.mailboxPending);
  const [since] = useState(startOfToday);
  const sentToday = useQuery(api.manufacturers.outreach.sentSince, { since });

  const drafts =
    messages?.filter((message) => message.status === "draft") ?? [];
  const approved =
    messages?.filter((message) => message.status === "approved") ?? [];

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium text-primary/80">{t("title")}</h1>
        <p className="text-base text-primary/60">{t("description")}</p>
        <p className="text-sm text-primary/60">
          {t("pace", { count: sentToday ?? 0 })}
        </p>
      </div>
      {readiness && !readiness.sent && <ReadinessPanel readiness={readiness} />}
      {mailbox && mailbox.length > 0 && (
        <Panel
          title={t("mailbox.title")}
          description={t("mailbox.description")}
        >
          <ul className="flex flex-col divide-y divide-border">
            {mailbox.map((erasure) => (
              <ErasureRow
                key={erasure._id}
                erasure={erasure}
                manufacturerName={erasure.manufacturerName}
              />
            ))}
          </ul>
        </Panel>
      )}
      {messages === undefined ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
      ) : (
        <>
          <Panel title={t("approved")}>
            <MessageList messages={approved} from={readiness?.senderEmail} />
          </Panel>
          <Panel title={t("drafts")}>
            <MessageList messages={drafts} from={readiness?.senderEmail} />
          </Panel>
        </>
      )}
    </div>
  );
}

/**
 * The steps before the first email, each with where it is done, until one is
 * marked sent.
 */
function ReadinessPanel({ readiness }: { readiness: Readiness }) {
  const t = useScopedI18n("admin.outreach.readiness");
  const settings = (label: string) => (
    <Link
      href="/admin/settings"
      className={buttonVariants({ size: "sm", variant: "outline" })}
    >
      {label}
    </Link>
  );
  const manufacturers = (
    <Link
      href="/admin/manufacturers"
      className={buttonVariants({ size: "sm", variant: "outline" })}
    >
      {t("manufacturersAction")}
    </Link>
  );
  const steps: {
    key: string;
    done: boolean;
    text: string;
    detail?: string;
    action?: ReactNode;
  }[] = [
    {
      key: "key",
      done: readiness.hasApiKey,
      text: t("key"),
      detail: readiness.hasApiKey ? undefined : t("keyMissing"),
      action: settings(t("settingsAction")),
    },
    {
      key: "signature",
      done: readiness.signature,
      text: t("signature"),
      action: settings(t("settingsAction")),
    },
    {
      key: "controller",
      done: readiness.controller,
      text: t("controller"),
      action: settings(t("settingsAction")),
    },
    {
      key: "mailbox",
      done: readiness.senderEmail !== undefined,
      text: t("mailbox"),
      detail: readiness.senderEmail ?? t("mailboxMissing"),
      action: settings(t("settingsAction")),
    },
    {
      key: "manufacturers",
      done: readiness.manufacturers > 0,
      text: t("manufacturers"),
      detail:
        readiness.manufacturers > 0
          ? t("manufacturersCount", { count: readiness.manufacturers })
          : undefined,
      action: manufacturers,
    },
    {
      key: "research",
      done: readiness.researched > 0,
      text: t("research"),
      detail:
        readiness.manufacturers > 0
          ? t("researchCount", {
              count: readiness.researched,
              total: readiness.manufacturers,
            })
          : undefined,
      action: manufacturers,
    },
    {
      key: "send",
      done: readiness.sent,
      text: t("send"),
      detail: t("sendCount", {
        drafts: readiness.drafts,
        approved: readiness.approved,
      }),
    },
  ];

  return (
    <Panel title={t("title")} description={t("description")}>
      <ol className="m-0 grid list-none gap-4 p-0">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className="grid grid-cols-[auto_minmax(0,1fr)] gap-3"
          >
            <span
              aria-hidden
              className={cn(
                "grid size-6 place-items-center rounded-full text-xs tabular-nums",
                step.done
                  ? "bg-success-dot/15 text-success-dot [&_svg]:size-3.5"
                  : "bg-primary/5 text-primary/70",
              )}
            >
              {step.done ? <Icons.Check /> : index + 1}
            </span>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p
                  className={cn(
                    "text-sm",
                    step.done ? "text-primary/50" : "text-primary",
                  )}
                >
                  {step.text}
                  {step.done && <span className="sr-only"> {t("done")}</span>}
                </p>
                {step.detail && (
                  <p className="text-xs text-primary/50">{step.detail}</p>
                )}
              </div>
              {!step.done && step.action}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function MessageList({
  messages,
  from,
}: {
  messages: QueuedMessage[];
  from?: string;
}) {
  const t = useScopedI18n("admin.outreach");
  if (messages.length === 0) {
    return <p className="text-sm text-primary/60">{t("empty")}</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {messages.map((message) => (
        <MessageRow key={message._id} message={message} from={from} />
      ))}
    </ul>
  );
}

function MessageRow({
  message,
  from,
}: {
  message: QueuedMessage;
  from?: string;
}) {
  const t = useScopedI18n("admin.outreach");
  const tAdmin = useScopedI18n("admin");
  const tEmail = useScopedI18n("admin.manufacturer.email");
  const approve = useMutation(api.manufacturers.outreach.approve);
  const markSent = useMutation(api.manufacturers.outreach.markSent);
  const { run, error, pending } = useRun();
  const problems = message.issues.filter((issue) => issue.level !== "info");
  const blocked = message.issues.some((issue) => issue.level === "error");
  const messageId = message._id;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/manufacturers/${message.manufacturerId}`}
            className="font-medium text-primary hover:underline"
          >
            {message.manufacturerName}
          </Link>
          {message.step === "thanks" && <Pill>{t("thanks")}</Pill>}
          <Pill tone={messageTone[message.status]}>
            {tAdmin(`status.message.${message.status}`)}
          </Pill>
          {message.confidence && (
            <Pill tone={confidenceTone[message.confidence]}>
              {tAdmin(`confidence.${message.confidence}`)}
            </Pill>
          )}
          {problems.length > 0 && (
            <Pill tone={blocked ? "danger" : "warning"}>
              {t("problems", { count: problems.length })}
            </Pill>
          )}
        </div>
        <p className="truncate text-sm text-primary/60">
          {message.to ?? "—"} · {message.subject}
        </p>
        <ErrorText error={error} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/manufacturers/${message.manufacturerId}`}
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          {t("open")}
        </Link>
        {message.status === "draft" && (
          <Button
            size="sm"
            disabled={pending || blocked}
            onClick={() => run(() => approve({ messageId }))}
          >
            {tEmail("approve")}
          </Button>
        )}
        {message.status === "approved" && (
          <>
            <a
              href={mailtoUrl(message)}
              className={buttonVariants({ size: "sm" })}
            >
              {tEmail("mailto")}
            </a>
            <a
              href={gmailComposeUrl(message, from)}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              {tEmail("gmail")}
            </a>
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => run(() => markSent({ messageId }))}
            >
              {tEmail("markSent")}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
