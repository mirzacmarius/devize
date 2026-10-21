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
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { SegmentedControl } from "@/components/segmented-control";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";
import { ClientSheet } from "../../../clients/_components/client-sheet";
import {
  ClientSelect,
  CountySelect,
  type Store,
  StoreSelect,
} from "../../_components/estimate-fields";
import type { Estimate } from "./types";

type EstimateKind = Doc<"estimates">["kind"];

/** Changes what the Deviz is for: the work, the client, the site, the tender. */
export function DetailsSheet({
  estimate,
  open,
  onClose,
}: {
  estimate: Estimate;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent closeLabel={tc("close")} className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("details.sheetTitle")}</SheetTitle>
          <SheetDescription>{t("details.sheetDescription")}</SheetDescription>
        </SheetHeader>
        {open && <DetailsForm estimate={estimate} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function DetailsForm({
  estimate,
  onDone,
}: {
  estimate: Estimate;
  onDone: () => void;
}) {
  const t = useScopedI18n("estimate");
  const tFields = useScopedI18n("estimates");
  const tc = useScopedI18n("common");
  const update = useMutation(api.estimates.estimates.update);
  const run = useRun();
  const [title, setTitle] = useState(estimate.title);
  const [kind, setKind] = useState<EstimateKind>(estimate.kind);
  const [clientId, setClientId] = useState<Id<"clients"> | null>(
    estimate.client?._id ?? null,
  );
  const [siteAddress, setSiteAddress] = useState(estimate.siteAddress ?? "");
  const [county, setCounty] = useState(estimate.county ?? "");
  const [store, setStore] = useState<Store | null>(
    estimate.preferredStore ?? null,
  );
  const [description, setDescription] = useState(estimate.description ?? "");
  const [authority, setAuthority] = useState(estimate.tender?.authority ?? "");
  const [procedure, setProcedure] = useState(estimate.tender?.procedure ?? "");
  const [deadline, setDeadline] = useState(estimate.tender?.deadline ?? "");
  const [addingClient, setAddingClient] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError(tFields("titleRequired"));
      return;
    }
    setError(undefined);
    setSaving(true);
    // Empty fields clear what was there.
    const result = await run(
      () =>
        update({
          estimateId: estimate._id,
          title: title.trim(),
          kind,
          clientId,
          siteAddress: siteAddress.trim(),
          county,
          preferredStore: store,
          description: description.trim(),
          ...(kind === "tender"
            ? {
                tender: {
                  authority: authority.trim(),
                  procedure: procedure.trim(),
                  deadline: deadline || undefined,
                },
              }
            : {}),
        }),
      t("details.saved"),
    );
    setSaving(false);
    if (result.ok) {
      onDone();
    }
  };

  return (
    <>
      <form className="grid gap-5" onSubmit={submit} noValidate>
        <Field
          label={tFields("fields.title")}
          htmlFor="details-title"
          error={error}
        >
          <Input
            id="details-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={error !== undefined}
          />
        </Field>
        <Field label={tFields("fields.kind")}>
          <SegmentedControl
            label={tFields("fields.kind")}
            value={kind}
            onChange={setKind}
            options={[
              { value: "private", label: tFields("kinds.private") },
              { value: "tender", label: tFields("kinds.tender") },
            ]}
          />
        </Field>
        <Field label={tFields("fields.client")} htmlFor="details-client">
          <div className="flex gap-2">
            <ClientSelect
              id="details-client"
              value={clientId}
              onChange={setClientId}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddingClient(true)}
            >
              {tFields("addClient")}
            </Button>
          </div>
        </Field>
        <Field label={tFields("fields.siteAddress")} htmlFor="details-address">
          <Input
            id="details-address"
            value={siteAddress}
            onChange={(event) => setSiteAddress(event.target.value)}
          />
        </Field>
        <Field label={tFields("fields.county")} htmlFor="details-county">
          <CountySelect
            id="details-county"
            value={county}
            onChange={setCounty}
          />
        </Field>
        {kind === "tender" && (
          <>
            <Field
              label={tFields("fields.authority")}
              htmlFor="details-authority"
            >
              <Input
                id="details-authority"
                value={authority}
                onChange={(event) => setAuthority(event.target.value)}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={tFields("fields.procedure")}
                htmlFor="details-procedure"
                hint={tFields("fields.procedureHint")}
              >
                <Input
                  id="details-procedure"
                  value={procedure}
                  onChange={(event) => setProcedure(event.target.value)}
                />
              </Field>
              <Field
                label={tFields("fields.deadline")}
                htmlFor="details-deadline"
              >
                <Input
                  id="details-deadline"
                  type="date"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                />
              </Field>
            </div>
          </>
        )}
        <Field
          label={tFields("fields.store")}
          htmlFor="details-store"
          hint={tFields("fields.storeHint")}
        >
          <StoreSelect id="details-store" value={store} onChange={setStore} />
        </Field>
        <Field
          label={tFields("fields.description")}
          htmlFor="details-description"
        >
          <Textarea
            id="details-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
          />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onDone}>
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Icons.Loader className="animate-spin" aria-hidden />}
            {tc("save")}
          </Button>
        </div>
      </form>
      <ClientSheet
        client={null}
        open={addingClient}
        onOpenChange={setAddingClient}
        onCreated={setClientId}
      />
    </>
  );
}
