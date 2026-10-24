"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button, buttonVariants } from "@devize/ui/button";
import { Input } from "@devize/ui/input";
import { toast } from "@devize/ui/sonner";
import { useMutation, useQuery } from "convex/react";
import { useId, useState } from "react";
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

  return (
    <Panel
      title={t("title")}
      description={t("notice")}
      actions={
        message && (
          <>
            {message.variant && (
              <Pill>{t("variant", { variant: message.variant })}</Pill>
            )}
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
      <MessageHistory history={history} />
    </Panel>
  );
}

/** Earlier emails of one kind: who they went to, and when. */
export function MessageHistory({ history }: { history: Message[] }) {
  const t = useScopedI18n("admin.manufacturer.email");
  const tAdmin = useScopedI18n("admin");
  const format = useFormat();
  if (history.length === 0) {
    return null;
  }
  return (
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
            <span className="text-primary/70">
              {old.recipientErasedAt !== undefined && !old.to
                ? t("recipientErased", {
                    date: format.date(old.recipientErasedAt),
                  })
                : old.to}
            </span>
            <span className="text-primary/50">
              {format.date(old.sentAt ?? old.updatedAt)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Edits one email, opens it to send from the person's own mailbox and records
 * that it was sent. Opening or copying a draft approves it, once it breaks no
 * rule.
 */
export function EmailEditor({
  message,
  contacts,
}: {
  message: Message;
  contacts: Contact[];
}) {
  const t = useScopedI18n("admin.manufacturer.email");
  const format = useFormat();
  const id = useId();
  const updateMessage = useMutation(api.manufacturers.outreach.updateMessage);
  const rerender = useMutation(api.manufacturers.outreach.rerender);
  const approve = useMutation(api.manufacturers.outreach.approve);
  const reject = useMutation(api.manufacturers.outreach.reject);
  const markSent = useMutation(api.manufacturers.outreach.markSent);
  const [to, setTo] = useState(message.to ?? "");
  const [subject, setSubject] = useState(message.subject);
  const [body, setBody] = useState(message.body);
  const { run, error, pending } = useRun();

  const draft = message.status === "draft";
  const editable = draft || message.status === "approved";
  const changed =
    to !== (message.to ?? "") ||
    subject !== message.subject ||
    body !== message.body;
  const blocked = message.issues.some((issue) => issue.level === "error");
  const messageId = message._id;
  const caption = changed
    ? t("saveFirst")
    : draft && blocked
      ? t("fixFirst")
      : draft
        ? t("opensApprove")
        : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Field label={t("to")} htmlFor={`${id}-to`}>
        <Input
          id={`${id}-to`}
          type="email"
          list={`${id}-contacts`}
          value={to}
          disabled={!editable}
          onChange={(event) => setTo(event.target.value)}
        />
        <datalist id={`${id}-contacts`}>
          {contacts.map(
            (contact) =>
              contact.email && (
                <option key={contact._id} value={contact.email} />
              ),
          )}
        </datalist>
      </Field>
      <Field label={t("subject")} htmlFor={`${id}-subject`}>
        <Input
          id={`${id}-subject`}
          value={subject}
          disabled={!editable}
          onChange={(event) => setSubject(event.target.value)}
        />
      </Field>
      <Field label={t("body")} htmlFor={`${id}-body`}>
        <Textarea
          id={`${id}-body`}
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
        {editable && (
          <SendButtons
            email={message}
            disabled={changed || (draft && blocked)}
            onOpen={() => {
              if (draft && !pending) {
                run(() => approve({ messageId }));
              }
            }}
          />
        )}
        {message.status === "approved" && !changed && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => markSent({ messageId }))}
          >
            {t("markSent")}
          </Button>
        )}
        {draft && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => rerender({ messageId }))}
          >
            {t("rerender")}
          </Button>
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
      {caption && <p className="text-xs text-primary/50">{caption}</p>}

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

/**
 * The email in the person's own email app or in Gmail, with recipient,
 * subject and text filled in, or its text to paste in a contact form.
 * `onOpen` runs as they open or copy it.
 */
function SendButtons({
  email,
  disabled,
  onOpen,
}: {
  email: { to?: string; subject: string; body: string };
  disabled: boolean;
  onOpen: () => void;
}) {
  const t = useScopedI18n("admin.manufacturer.email");
  const from = useQuery(api.manufacturers.outreach.getSettings)?.senderEmail;
  if (disabled) {
    return (
      <>
        <Button disabled>{t("mailto")}</Button>
        <Button variant="outline" disabled>
          {t("gmail")}
        </Button>
        <Button variant="outline" disabled>
          {t("copy")}
        </Button>
      </>
    );
  }
  return (
    <>
      <a href={mailtoUrl(email)} onClick={onOpen} className={buttonVariants()}>
        {t("mailto")}
      </a>
      <a
        href={gmailComposeUrl(email, from)}
        target="_blank"
        rel="noreferrer noopener"
        onClick={onOpen}
        className={buttonVariants({ variant: "outline" })}
      >
        {t("gmail")}
      </a>
      <Button
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              `${email.subject}\n\n${email.body}`,
            );
          } catch {
            toast.error(t("copyFailed"));
            return;
          }
          toast.success(t("copied"));
          onOpen();
        }}
      >
        {t("copy")}
      </Button>
    </>
  );
}
