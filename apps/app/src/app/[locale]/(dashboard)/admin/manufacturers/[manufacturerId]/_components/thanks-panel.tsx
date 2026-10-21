"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Input } from "@devize/ui/input";
import { useMutation } from "convex/react";
import { type FormEvent, useId, useState } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  ErrorText,
  Field,
  messageTone,
  Panel,
  Pill,
  useRun,
} from "../../../_components/ui";
import { EmailEditor, MessageHistory } from "./email-panel";
import type { Contact, Manufacturer, Message } from "./types";

/**
 * The thank-you to whoever sent the manufacturer's norms, with a link that
 * lets their address claim its profile (ADR 0018). Like the first email, a
 * super admin approves it and sends it from their own mailbox.
 */
export function ThanksPanel({
  manufacturer,
  messages,
  contacts,
  suggestedTo,
}: {
  manufacturer: Manufacturer;
  messages: Message[];
  contacts: Contact[];
  // Where the first email went, the likeliest sender of the norms.
  suggestedTo: string | undefined;
}) {
  const t = useScopedI18n("admin.manufacturer.thanks");
  const tEmail = useScopedI18n("admin.manufacturer.email");
  const tAdmin = useScopedI18n("admin");
  const open = messages.find(
    (message) => message.status === "draft" || message.status === "approved",
  );
  const history = messages.filter((message) => message !== open);

  return (
    <Panel
      title={t("title")}
      description={t("description")}
      actions={
        open && (
          <>
            {open.edited && <Pill>{tEmail("edited")}</Pill>}
            <Pill tone={messageTone[open.status]}>
              {tAdmin(`status.message.${open.status}`)}
            </Pill>
          </>
        )
      }
    >
      {open ? (
        <EmailEditor
          key={`${open._id}-${open.updatedAt}-${open.status}`}
          message={open}
          contacts={contacts}
        />
      ) : manufacturer.claimStatus === "claimed" ? (
        <p className="text-sm text-primary/60">{t("claimed")}</p>
      ) : manufacturer.status === "excluded" ? (
        <p className="text-sm text-primary/60">{t("excluded")}</p>
      ) : (
        <ThanksForm
          manufacturer={manufacturer}
          contacts={contacts}
          suggestedTo={suggestedTo}
        />
      )}
      <MessageHistory history={history} />
    </Panel>
  );
}

function ThanksForm({
  manufacturer,
  contacts,
  suggestedTo,
}: {
  manufacturer: Manufacturer;
  contacts: Contact[];
  suggestedTo: string | undefined;
}) {
  const t = useScopedI18n("admin.manufacturer.thanks");
  const id = useId();
  const draftThanks = useMutation(api.manufacturers.outreach.draftThanks);
  const [to, setTo] = useState(suggestedTo ?? "");
  const { run, error, pending } = useRun();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (to.trim()) {
      await run(() => draftThanks({ manufacturerId: manufacturer._id, to }));
    }
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t("to")} htmlFor={`${id}-to`}>
          <Input
            id={`${id}-to`}
            type="email"
            list={`${id}-contacts`}
            className="w-72"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <datalist id={`${id}-contacts`}>
            {contacts.map(
              (contact) =>
                contact.email &&
                !contact.suppressed && (
                  <option key={contact._id} value={contact.email} />
                ),
            )}
          </datalist>
        </Field>
        <Button type="submit" disabled={pending || !to.trim()}>
          {t("prepare")}
        </Button>
      </div>
      <ErrorText error={error} />
    </form>
  );
}
