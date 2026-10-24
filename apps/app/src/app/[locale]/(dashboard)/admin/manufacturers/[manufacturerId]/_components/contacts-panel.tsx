"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { Input } from "@devize/ui/input";
import { useDoubleCheck } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  ErrorText,
  ExternalLink,
  Field,
  NativeSelect,
  Panel,
  Pill,
  useFormat,
  useRun,
} from "../../../_components/ui";
import type { Contact, Message } from "./types";

const kinds = ["generic", "department", "person", "form"] as const;

export function ContactsPanel({
  manufacturerId,
  contacts,
  message,
}: {
  manufacturerId: Id<"manufacturers">;
  contacts: Contact[];
  message: Message | undefined;
}) {
  const t = useScopedI18n("admin.manufacturer.contacts");
  const tAdmin = useScopedI18n("admin");
  const chooseContact = useMutation(api.manufacturers.outreach.chooseContact);
  const suppress = useMutation(api.manufacturers.outreach.suppress);
  const removeContact = useMutation(api.manufacturers.admin.removeContact);
  const stillInTouch = useMutation(api.manufacturers.admin.stillInTouch);
  const { run, error, pending } = useRun();
  const format = useFormat();
  const canUse = message?.status === "draft";
  // A firm in touch keeps its people's addresses 2 years after the last
  // message between us; a new answer starts them again.
  const inTouch = contacts.some(
    (contact) => contact.retention?.rule === "inactive",
  );

  return (
    <Panel
      title={t("title")}
      description={t("description")}
      actions={
        inTouch && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => stillInTouch({ manufacturerId }))}
          >
            {t("stillInTouch")}
          </Button>
        )
      }
    >
      <p className="text-sm text-primary/60">{t("retention")}</p>
      <ErrorText error={error} />
      {contacts.length === 0 ? (
        <p className="text-sm text-primary/60">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {contacts.map((contact) => (
            <li
              key={contact._id}
              className="flex flex-col gap-2 py-3 first:pt-0"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-primary">
                  {contact.email ?? <ExternalLink href={contact.url ?? ""} />}
                </span>
                <Pill>{tAdmin(`contactKind.${contact.kind}`)}</Pill>
                {contact.origin === "manual" ? (
                  <Pill>{t("manual")}</Pill>
                ) : contact.sourceVerified ? (
                  <Pill tone="success">{t("verified")}</Pill>
                ) : (
                  <Pill tone="warning">{t("unverified")}</Pill>
                )}
                {contact.suppressed && (
                  <Pill tone="danger">{t("suppressed")}</Pill>
                )}
                {message?.to && contact.email === message.to && (
                  <Pill tone="info">{tAdmin("manufacturer.email.to")}</Pill>
                )}
                {contact.retention &&
                  (contact.retention.at === null ? (
                    <Pill>{t("kept")}</Pill>
                  ) : contact.retention.rule === "inactive" ? (
                    <Pill>
                      {t("keptUntil", {
                        date: format.date(contact.retention.at),
                      })}
                    </Pill>
                  ) : (
                    <Pill tone="warning">
                      {contact.retention.at === 0
                        ? t("erasesNow")
                        : t("erasesOn", {
                            date: format.date(contact.retention.at),
                          })}
                    </Pill>
                  ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-primary/60">
                {contact.role && <span>{contact.role}</span>}
                {contact.sourceUrl && (
                  <ExternalLink href={contact.sourceUrl}>
                    {t("source")}
                  </ExternalLink>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {canUse &&
                  message &&
                  contact.email !== message.to &&
                  !contact.suppressed && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          chooseContact({
                            messageId: message._id,
                            contactId: contact._id,
                          }),
                        )
                      }
                    >
                      {t("use")}
                    </Button>
                  )}
                {contact.email && !contact.suppressed && (
                  <SuppressButton
                    disabled={pending}
                    onConfirm={() =>
                      run(() => suppress({ value: contact.email ?? "" }))
                    }
                  />
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    run(() => removeContact({ contactId: contact._id }))
                  }
                >
                  {t("remove")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <AddContact manufacturerId={manufacturerId} />
    </Panel>
  );
}

// Excluding an address also erases a person's address everywhere, so it
// asks twice.
function SuppressButton({
  disabled,
  onConfirm,
}: {
  disabled: boolean;
  onConfirm: () => void;
}) {
  const t = useScopedI18n("admin.manufacturer.contacts");
  const { doubleCheck, getButtonProps } = useDoubleCheck();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={disabled}
      {...getButtonProps({ onClick: doubleCheck ? onConfirm : undefined })}
    >
      {doubleCheck ? t("suppressConfirm") : t("suppress")}
    </Button>
  );
}

function AddContact({
  manufacturerId,
}: {
  manufacturerId: Id<"manufacturers">;
}) {
  const t = useScopedI18n("admin.manufacturer.contacts.add");
  const tAdmin = useScopedI18n("admin");
  const addContact = useMutation(api.manufacturers.admin.addContact);
  const [kind, setKind] = useState<(typeof kinds)[number]>("generic");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [role, setRole] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const { run, error, pending } = useRun();

  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-primary/80">
        {t("title")}
      </summary>
      <form
        className="mt-3 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          run(async () => {
            await addContact({
              manufacturerId,
              kind,
              email: kind === "form" ? undefined : email,
              url: kind === "form" ? url : undefined,
              role,
              sourceUrl,
            });
            setEmail("");
            setUrl("");
            setRole("");
            setSourceUrl("");
          });
        }}
      >
        <Field label={t("kind")} htmlFor="contact_kind">
          <NativeSelect
            id="contact_kind"
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as (typeof kinds)[number])
            }
          >
            {kinds.map((value) => (
              <option key={value} value={value}>
                {tAdmin(`contactKind.${value}`)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {kind === "form" ? (
          <Field label={t("url")} htmlFor="contact_url">
            <Input
              id="contact_url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
            />
          </Field>
        ) : (
          <Field label={t("email")} htmlFor="contact_email">
            <Input
              id="contact_email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
        )}
        <Field label={t("role")} htmlFor="contact_role">
          <Input
            id="contact_role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          />
        </Field>
        <Field label={t("source")} htmlFor="contact_source">
          <Input
            id="contact_source"
            type="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
          />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" size="sm" disabled={pending}>
            {t("submit")}
          </Button>
          <ErrorText error={error} />
        </div>
      </form>
    </details>
  );
}
