"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc, Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@devize/ui/sheet";
import { Textarea } from "@devize/ui/textarea";
import { useDoubleCheck } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { useFirm } from "@/components/firm-provider";
import { SegmentedControl } from "@/components/segmented-control";
import { useRun } from "@/components/use-run";
import { isValidCui } from "@/lib/validation";
import { useScopedI18n } from "@/locales/client";

type ClientKind = Doc<"clients">["kind"];

/** Adds a client, or edits and deletes one, in a sheet from the right. */
export function ClientSheet({
  client,
  open,
  onOpenChange,
  onCreated,
}: {
  client: Doc<"clients"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (clientId: Id<"clients">) => void;
}) {
  const t = useScopedI18n("clients");
  const tc = useScopedI18n("common");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent closeLabel={tc("close")} className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{client ? t("editTitle") : t("newTitle")}</SheetTitle>
          <SheetDescription>{t("sheetDescription")}</SheetDescription>
        </SheetHeader>
        {open && (
          <ClientForm
            key={client?._id ?? "new"}
            client={client}
            onDone={(clientId) => {
              onOpenChange(false);
              if (!client && clientId) {
                onCreated?.(clientId);
              }
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ClientForm({
  client,
  onDone,
}: {
  client: Doc<"clients"> | null;
  onDone: (clientId?: Id<"clients">) => void;
}) {
  const t = useScopedI18n("clients");
  const tc = useScopedI18n("common");
  const { firm } = useFirm();
  const create = useMutation(api.accounts.clients.create);
  const update = useMutation(api.accounts.clients.update);
  const remove = useMutation(api.accounts.clients.remove);
  const run = useRun();
  const { doubleCheck, getButtonProps } = useDoubleCheck();
  const [kind, setKind] = useState<ClientKind>(client?.kind ?? "person");
  const [name, setName] = useState(client?.name ?? "");
  const [cui, setCui] = useState(client?.cui ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [address, setAddress] = useState(client?.address ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [errors, setErrors] = useState<{ name?: string; cui?: string }>({});
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const companyCui = kind === "company" ? cui.trim() : "";
    const found = {
      name: name.trim() ? undefined : t("nameRequired"),
      cui: companyCui && !isValidCui(companyCui) ? t("cuiInvalid") : undefined,
    };
    setErrors(found);
    if (found.name || found.cui) {
      return;
    }
    // Empty fields clear what was there.
    const fields = {
      kind,
      name: name.trim(),
      cui: companyCui,
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      notes: notes.trim(),
    };
    setSaving(true);
    const result = client
      ? await run(() => update({ clientId: client._id, ...fields }), t("saved"))
      : await run(
          () => create({ organizationId: firm._id, ...fields }),
          t("created"),
        );
    setSaving(false);
    if (result.ok) {
      onDone(result.value ?? undefined);
    }
  };

  const deleteClient = async () => {
    if (!client) {
      return;
    }
    const result = await run(
      () => remove({ clientId: client._id }),
      t("deleted"),
    );
    if (result.ok) {
      onDone();
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field label={t("fields.kind")}>
        <SegmentedControl
          label={t("fields.kind")}
          value={kind}
          onChange={setKind}
          options={[
            { value: "person", label: t("kinds.person") },
            { value: "company", label: t("kinds.company") },
          ]}
        />
      </Field>
      <Field
        label={
          kind === "company" ? t("fields.nameCompany") : t("fields.namePerson")
        }
        htmlFor="client-name"
        error={errors.name}
      >
        <Input
          id="client-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={errors.name !== undefined}
          autoComplete="off"
        />
      </Field>
      {kind === "company" && (
        <Field label={t("fields.cui")} htmlFor="client-cui" error={errors.cui}>
          <Input
            id="client-cui"
            value={cui}
            onChange={(event) => setCui(event.target.value)}
            inputMode="numeric"
            className="font-mono"
            aria-invalid={errors.cui !== undefined}
          />
        </Field>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("fields.phone")} htmlFor="client-phone">
          <Input
            id="client-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>
        <Field label={t("fields.email")} htmlFor="client-email">
          <Input
            id="client-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
      </div>
      <Field label={t("fields.address")} htmlFor="client-address">
        <Input
          id="client-address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
      </Field>
      <Field
        label={t("fields.notes")}
        htmlFor="client-notes"
        hint={t("fields.notesHint")}
      >
        <Textarea
          id="client-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <Icons.Loader className="animate-spin" aria-hidden />}
          {client ? tc("save") : t("create")}
        </Button>
        {client && (
          <Button
            type="button"
            variant="destructive"
            {...getButtonProps({
              onClick: doubleCheck ? deleteClient : undefined,
            })}
          >
            {doubleCheck ? tc("confirmDelete") : t("delete")}
          </Button>
        )}
      </div>
    </form>
  );
}
