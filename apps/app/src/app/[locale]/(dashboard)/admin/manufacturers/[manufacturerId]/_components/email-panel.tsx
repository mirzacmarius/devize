"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button, buttonVariants } from "@devize/ui/button";
import { Input } from "@devize/ui/input";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import { gmailComposeUrl, mailtoUrl } from "../../../_components/email-links";
import {
  ErrorText,
  Field,
  IssueList,
  messageTone,
  Panel,
  Pill,
  Textarea,
  useFormat,
  useRun,
} from "../../../_components/ui";
import type { Contact, Message } from "./types";

export function EmailPanel({
  message,
  history,
  contacts,
}: {
  message: Message | undefined;
  history: Message[];
  contacts: Contact[];
}) {
  const t = useScopedI18n("admin.manufacturer.email");
  const tAdmin = useScopedI18n("admin");
  const format = useFormat();

  return (
    <Panel
      title={t("title")}
      description={t("notice")}
      actions={
        message && (
          <>
            <Pill>{t("variant", { variant: message.variant })}</Pill>
            {message.edited && <Pill>{t("edited")}</Pill>}
            <Pill tone={messageTone[message.status]}>
              {tAdmin(`status.message.${message.status}`)}
            </Pill>
          </>
        )
      }
    >
      {message ? (
        // Remounted whenever the saved email changes, so the fields show it.
        <EmailEditor
          key={`${message._id}-${message.updatedAt}-${message.status}`}
          message={message}
          contacts={contacts}
        />
      ) : (
        <p className="text-sm text-primary/60">{t("none")}</p>
      )}
      {history.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-primary/80">
            {t("history")}
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {history.map((old) => (
              <li key={old._id} className="flex flex-wrap items-center gap-2">
                <Pill tone={messageTone[old.status]}>
                  {tAdmin(`status.message.${old.status}`)}
                </Pill>
                <span className="text-primary/70">{old.to}</span>
                <span className="text-primary/50">
                  {format.date(old.sentAt ?? old.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  );
}

function EmailEditor({
  message,
  contacts,
}: {
  message: Message;
  contacts: Contact[];
}) {
  const t = useScopedI18n("admin.manufacturer.email");
  const format = useFormat();
  const updateMessage = useMutation(api.manufacturers.outreach.updateMessage);
  const rerender = useMutation(api.manufacturers.outreach.rerender);
  const approve = useMutation(api.manufacturers.outreach.approve);
  const reject = useMutation(api.manufacturers.outreach.reject);
  const markSent = useMutation(api.manufacturers.outreach.markSent);
  const [to, setTo] = useState(message.to ?? "");
  const [subject, setSubject] = useState(message.subject);
  const [body, setBody] = useState(message.body);
  const [copied, setCopied] = useState(false);
  const { run, error, pending } = useRun();

  const editable = message.status === "draft" || message.status === "approved";
  const changed =
    to !== (message.to ?? "") ||
    subject !== message.subject ||
    body !== message.body;
  const blocked = message.issues.some((issue) => issue.level === "error");
  const messageId = message._id;

  return (
    <div className="flex flex-col gap-4">
      <Field label={t("to")} htmlFor="email_to">
        <Input
          id="email_to"
          type="email"
          list="email_contacts"
          value={to}
          disabled={!editable}
          onChange={(event) => setTo(event.target.value)}
        />
        <datalist id="email_contacts">
          {contacts.map(
            (contact) =>
              contact.email && (
                <option key={contact._id} value={contact.email} />
              ),
          )}
        </datalist>
      </Field>
      <Field label={t("subject")} htmlFor="email_subject">
        <Input
          id="email_subject"
          value={subject}
          disabled={!editable}
          onChange={(event) => setSubject(event.target.value)}
        />
      </Field>
      <Field label={t("body")} htmlFor="email_body">
        <Textarea
          id="email_body"
          rows={18}
          value={body}
          disabled={!editable}
          onChange={(event) => setBody(event.target.value)}
          className="font-[inherit] leading-relaxed"
        />
      </Field>

      {message.issues.length > 0 ? (
        <IssueList issues={message.issues} />
      ) : (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          {t("rules")}
        </p>
      )}

      <ErrorText error={error} />

      <div className="flex flex-wrap gap-2">
        {editable && changed && (
          <Button
            disabled={pending}
            onClick={() =>
              run(() => updateMessage({ messageId, to, subject, body }))
            }
          >
            {t("save")}
          </Button>
        )}
        {message.status === "draft" && !changed && (
          <Button
            disabled={pending || blocked}
            onClick={() => run(() => approve({ messageId }))}
          >
            {t("approve")}
          </Button>
        )}
        {message.status === "draft" && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => rerender({ messageId }))}
          >
            {t("rerender")}
          </Button>
        )}
        {message.status === "approved" && !changed && (
          <>
            <a
              href={gmailComposeUrl(message)}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonVariants()}
            >
              {t("gmail")}
            </a>
            <a
              href={mailtoUrl(message)}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("mailto")}
            </a>
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `${message.subject}\n\n${message.body}`,
                );
                setCopied(true);
              }}
            >
              {copied ? t("copied") : t("copy")}
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => run(() => markSent({ messageId }))}
            >
              {t("markSent")}
            </Button>
          </>
        )}
        {editable && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => reject({ messageId }))}
          >
            {t("reject")}
          </Button>
        )}
      </div>

      {message.approvedAt && message.status === "approved" && (
        <p className="text-xs text-primary/50">
          {t("approvedAt", { date: format.date(message.approvedAt) })}
        </p>
      )}
      {message.sentAt && (
        <p className="text-xs text-primary/50">
          {t("sentAt", { date: format.date(message.sentAt) })}
        </p>
      )}
    </div>
  );
}
