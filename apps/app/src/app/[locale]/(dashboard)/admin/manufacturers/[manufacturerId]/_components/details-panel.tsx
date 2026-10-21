"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Input } from "@devize/ui/input";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  ErrorText,
  Field,
  NativeSelect,
  Panel,
  Textarea,
  useRun,
} from "../../../_components/ui";
import type { Manufacturer } from "./types";

const statuses = [
  "new",
  "review",
  "approved",
  "contacted",
  "replied",
  "norms_received",
  "declined",
  "excluded",
] as const;

export function DetailsPanel({ manufacturer }: { manufacturer: Manufacturer }) {
  const t = useScopedI18n("admin.manufacturer.details");
  return (
    <Panel title={t("title")}>
      {/* Remounted when the saved values change, so the fields show them. */}
      <DetailsForm
        key={[
          manufacturer.name,
          manufacturer.wave,
          manufacturer.status,
          manufacturer.website,
          manufacturer.hints,
          manufacturer.notes,
        ].join("|")}
        manufacturer={manufacturer}
      />
    </Panel>
  );
}

function DetailsForm({ manufacturer }: { manufacturer: Manufacturer }) {
  const t = useScopedI18n("admin.manufacturer.details");
  const tAdmin = useScopedI18n("admin");
  const update = useMutation(api.manufacturers.admin.update);
  const [name, setName] = useState(manufacturer.name);
  const [wave, setWave] = useState(manufacturer.wave);
  const [status, setStatus] = useState(manufacturer.status);
  const [website, setWebsite] = useState(manufacturer.website ?? "");
  const [hints, setHints] = useState(manufacturer.hints ?? "");
  const [notes, setNotes] = useState(manufacturer.notes ?? "");
  const { run, error, pending } = useRun();

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(() =>
          update({
            manufacturerId: manufacturer._id,
            name,
            wave,
            status,
            website: website.trim(),
            hints: hints.trim(),
            notes: notes.trim(),
          }),
        );
      }}
    >
      <Field label={t("name")} htmlFor="details_name">
        <Input
          id="details_name"
          value={name}
          required
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("wave")} htmlFor="details_wave">
          <NativeSelect
            id="details_wave"
            value={wave}
            onChange={(event) => setWave(Number(event.target.value))}
          >
            {[1, 2, 3].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t("status")} htmlFor="details_status">
          <NativeSelect
            id="details_status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as (typeof statuses)[number])
            }
          >
            {statuses.map((value) => (
              <option key={value} value={value}>
                {tAdmin(`status.manufacturer.${value}`)}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label={t("website")} htmlFor="details_website">
        <Input
          id="details_website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </Field>
      <Field label={t("hints")} htmlFor="details_hints">
        <Input
          id="details_hints"
          value={hints}
          onChange={(event) => setHints(event.target.value)}
        />
      </Field>
      <Field
        label={t("notes")}
        htmlFor="details_notes"
        className="sm:col-span-2"
      >
        <Textarea
          id="details_notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t("save")}
        </Button>
        <ErrorText error={error} />
      </div>
    </form>
  );
}
