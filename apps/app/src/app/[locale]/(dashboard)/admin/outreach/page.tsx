"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button, buttonVariants } from "@devize/ui/button";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import { gmailComposeUrl } from "../_components/email-links";
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

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

export default function OutreachPage() {
  const t = useScopedI18n("admin.outreach");
  const messages = useQuery(api.manufacturers.outreach.queue);
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
      {messages === undefined ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
      ) : (
        <>
          <Panel title={t("approved")}>
            <MessageList messages={approved} />
          </Panel>
          <Panel title={t("drafts")}>
            <MessageList messages={drafts} />
          </Panel>
        </>
      )}
    </div>
  );
}

function MessageList({ messages }: { messages: QueuedMessage[] }) {
  const t = useScopedI18n("admin.outreach");
  if (messages.length === 0) {
    return <p className="text-sm text-primary/60">{t("empty")}</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {messages.map((message) => (
        <MessageRow key={message._id} message={message} />
      ))}
    </ul>
  );
}

function MessageRow({ message }: { message: QueuedMessage }) {
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
              href={gmailComposeUrl(message)}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonVariants({ size: "sm" })}
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
