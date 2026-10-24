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
import { toast } from "@devize/ui/sonner";
import { useMutation, useQuery } from "convex/react";
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
import {
  parsedStarter,
  type StartFrom,
  StartFromField,
  useStartFromName,
} from "./start-from";

type EstimateKind = Doc<"estimates">["kind"];

/**
 * Starts a Deviz: from nothing or from a Șablon, what the work is, for whom
 * and where, and the date of its prices.
 */
export function NewEstimateDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // What the Deviz starts from when the dialog opens, as picked in Șabloane.
  initial?: StartFrom;
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
        {open && (
          <NewEstimateForm
            initial={initial ?? { kind: "blank" }}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewEstimateForm({
  initial,
  onClose,
}: {
  initial: StartFrom;
  onClose: () => void;
}) {
  const t = useScopedI18n("estimates");
  const tt = useScopedI18n("templates");
  const tc = useScopedI18n("common");
  const { firm } = useFirm();
  const create = useMutation(api.estimates.estimates.create);
  const start = useMutation(api.templates.templates.start);
  const templates = useQuery(api.templates.templates.list, {
    organizationId: firm._id,
  });
  const startFromName = useStartFromName();
  const run = useRun();
  const router = useRouter();
  const [startFrom, setStartFrom] = useState<StartFrom>(initial);
  // Until someone types a title, the Deviz takes its Șablon's name.
  const [typedTitle, setTypedTitle] = useState<string>();
  const title = typedTitle ?? startFromName(startFrom, templates) ?? "";
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
    const starter = parsedStarter(startFrom);
    if (startFrom.kind === "starter" && !starter) {
      return;
    }
    setError(undefined);
    setSaving(true);
    const details = {
      organizationId: firm._id,
      title: title.trim(),
      kind,
      clientId: clientId ?? undefined,
      siteAddress: siteAddress.trim() || undefined,
      county: county || undefined,
      priceDate: priceDate || undefined,
    };
    const result = await run(async () => {
      if (startFrom.kind === "template") {
        return await start({ ...details, templateId: startFrom.templateId });
      }
      if (starter) {
        return await start({
          ...details,
          starter: { key: starter.starter.key, values: starter.values },
        });
      }
      return { estimateId: await create(details), skipped: [] };
    });
    if (result.ok) {
      const { estimateId, skipped } = result.value;
      if (skipped.length > 0) {
        toast.warning(tt("skipped", { codes: skipped.join(", ") }));
      }
      // The list stays mounted, hidden, for Back (ADR 0029), so the dialog
      // closes rather than wait there open.
      onClose();
      router.push(`/estimates/${estimateId}`);
    } else {
      setSaving(false);
    }
  };

  return (
    <>
      <form className="grid gap-5" onSubmit={submit} noValidate>
        <StartFromField
          templates={templates}
          value={startFrom}
          onChange={setStartFrom}
        />
        <Field label={t("fields.title")} htmlFor="estimate-title" error={error}>
          <Input
            id="estimate-title"
            value={title}
            onChange={(event) => setTypedTitle(event.target.value)}
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
          <Button type="button" variant="ghost" onClick={onClose}>
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
