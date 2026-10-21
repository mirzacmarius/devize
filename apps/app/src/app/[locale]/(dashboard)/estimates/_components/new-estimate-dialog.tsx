"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc, Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Field } from "@/components/field";
import { useFirm } from "@/components/firm-provider";
import { SegmentedControl } from "@/components/segmented-control";
import { useRun } from "@/components/use-run";
import { todayInput } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import { ClientSheet } from "../../clients/_components/client-sheet";
import { ClientSelect, CountySelect } from "./estimate-fields";

type EstimateKind = Doc<"estimates">["kind"];

/** Starts a Deviz: what the work is, for whom and where, and the date of its prices. */
export function NewEstimateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useScopedI18n("estimates");
  const tc = useScopedI18n("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("newTitle")}</DialogTitle>
          <DialogDescription>{t("newDescription")}</DialogDescription>
        </DialogHeader>
        {open && <NewEstimateForm onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function NewEstimateForm({ onCancel }: { onCancel: () => void }) {
  const t = useScopedI18n("estimates");
  const tc = useScopedI18n("common");
  const { firm } = useFirm();
  const create = useMutation(api.estimates.estimates.create);
  const run = useRun();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EstimateKind>("private");
  const [clientId, setClientId] = useState<Id<"clients"> | null>(null);
  const [siteAddress, setSiteAddress] = useState("");
  const [county, setCounty] = useState("");
  const [priceDate, setPriceDate] = useState(() => todayInput());
  const [addingClient, setAddingClient] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError(t("titleRequired"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(() =>
      create({
        organizationId: firm._id,
        title: title.trim(),
        kind,
        clientId: clientId ?? undefined,
        siteAddress: siteAddress.trim() || undefined,
        county: county || undefined,
        priceDate: priceDate || undefined,
      }),
    );
    if (result.ok) {
      router.push(`/estimates/${result.value}`);
    } else {
      setSaving(false);
    }
  };

  return (
    <>
      <form className="grid gap-5" onSubmit={submit} noValidate>
        <Field label={t("fields.title")} htmlFor="estimate-title" error={error}>
          <Input
            id="estimate-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("fields.titlePlaceholder")}
            aria-invalid={error !== undefined}
            autoFocus
          />
        </Field>
        <Field label={t("fields.kind")}>
          <SegmentedControl
            label={t("fields.kind")}
            value={kind}
            onChange={setKind}
            options={[
              { value: "private", label: t("kinds.private") },
              { value: "tender", label: t("kinds.tender") },
            ]}
          />
        </Field>
        <Field label={t("fields.client")} htmlFor="estimate-client">
          <div className="flex gap-2">
            <ClientSelect
              id="estimate-client"
              value={clientId}
              onChange={setClientId}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddingClient(true)}
            >
              {t("addClient")}
            </Button>
          </div>
        </Field>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px]">
          <Field label={t("fields.siteAddress")} htmlFor="estimate-address">
            <Input
              id="estimate-address"
              value={siteAddress}
              onChange={(event) => setSiteAddress(event.target.value)}
            />
          </Field>
          <Field label={t("fields.county")} htmlFor="estimate-county">
            <CountySelect
              id="estimate-county"
              value={county}
              onChange={setCounty}
            />
          </Field>
        </div>
        <Field
          label={t("fields.priceDate")}
          htmlFor="estimate-price-date"
          hint={t("fields.priceDateHint")}
        >
          <Input
            id="estimate-price-date"
            type="date"
            value={priceDate}
            onChange={(event) => setPriceDate(event.target.value)}
            className="w-48"
          />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Icons.Loader className="animate-spin" aria-hidden />}
            {t("create")}
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
