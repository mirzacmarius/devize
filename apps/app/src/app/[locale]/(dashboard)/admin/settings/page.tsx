"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Input } from "@devize/ui/input";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import { ErrorText, Field, Panel, useFormat, useRun } from "../_components/ui";

const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

export default function AdminSettingsPage() {
  const t = useScopedI18n("admin.settings");
  const sender = useQuery(api.manufacturers.outreach.getSettings);

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-3xl font-medium text-primary/80">{t("title")}</h1>
      <ClaudeStatus />
      {sender === undefined ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
      ) : (
        <SenderForm sender={sender} />
      )}
      <SuppressionList />
    </div>
  );
}

function ClaudeStatus() {
  const t = useScopedI18n("admin.settings.api");
  const format = useFormat();
  const status = useQuery(api.ai.jobs.apiStatus);
  const [since] = useState(() => Date.now() - thirtyDaysMs);
  const costs = useQuery(api.ai.jobs.costSummary, { since });

  return (
    <Panel title={t("title")}>
      {status && (
        <p
          className={
            status.hasApiKey
              ? "text-sm text-primary/80"
              : "text-sm text-red-700 dark:text-red-300"
          }
        >
          {status.hasApiKey
            ? t("ready", { model: status.model })
            : t("missing")}
        </p>
      )}
      <p className="text-sm text-primary/60">{t("model")}</p>
      {costs && (
        <p className="text-sm text-primary/60">
          {t("costs", {
            jobs: costs.jobs,
            failed: costs.failed,
            cost: format.usd(costs.costUsd),
          })}
        </p>
      )}
    </Panel>
  );
}

function SenderForm({
  sender,
}: {
  sender: FunctionReturnType<typeof api.manufacturers.outreach.getSettings>;
}) {
  const t = useScopedI18n("admin.settings.sender");
  const updateSettings = useMutation(api.manufacturers.outreach.updateSettings);
  const [firstName, setFirstName] = useState(sender.firstName ?? "");
  const [lastName, setLastName] = useState(sender.lastName ?? "");
  const [phone, setPhone] = useState(sender.phone ?? "");
  const [privacyUrl, setPrivacyUrl] = useState(sender.privacyUrl ?? "");
  const [saved, setSaved] = useState(false);
  const { run, error, pending } = useRun();

  return (
    <Panel title={t("title")} description={t("description")}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaved(
            await run(() =>
              updateSettings({ firstName, lastName, phone, privacyUrl }),
            ),
          );
        }}
      >
        <Field label={t("firstName")} htmlFor="sender_first_name">
          <Input
            id="sender_first_name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </Field>
        <Field label={t("lastName")} htmlFor="sender_last_name">
          <Input
            id="sender_last_name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </Field>
        <Field label={t("phone")} htmlFor="sender_phone">
          <Input
            id="sender_phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>
        <Field label={t("privacyUrl")} htmlFor="sender_privacy">
          <Input
            id="sender_privacy"
            type="url"
            value={privacyUrl}
            onChange={(event) => setPrivacyUrl(event.target.value)}
          />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" size="sm" disabled={pending}>
            {t("save")}
          </Button>
          {saved && (
            <span className="text-sm text-primary/60">{t("saved")}</span>
          )}
          <ErrorText error={error} />
        </div>
      </form>
    </Panel>
  );
}

function SuppressionList() {
  const t = useScopedI18n("admin.settings.suppression");
  const format = useFormat();
  const rows = useQuery(api.manufacturers.outreach.listSuppressed);
  const suppress = useMutation(api.manufacturers.outreach.suppress);
  const unsuppress = useMutation(api.manufacturers.outreach.unsuppress);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const { run, error, pending } = useRun();

  return (
    <Panel title={t("title")} description={t("description")}>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await run(() => suppress({ value, reason }))) {
            setValue("");
            setReason("");
          }
        }}
      >
        <Field label={t("value")} htmlFor="suppress_value">
          <Input
            id="suppress_value"
            className="w-64"
            value={value}
            required
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
        <Field label={t("reason")} htmlFor="suppress_reason">
          <Input
            id="suppress_reason"
            className="w-64"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        <Button type="submit" size="sm" disabled={pending}>
          {t("add")}
        </Button>
      </form>
      <ErrorText error={error} />
      {rows && rows.length === 0 && (
        <p className="text-sm text-primary/60">{t("empty")}</p>
      )}
      {rows && rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-border text-sm">
          {rows.map((row) => (
            <li
              key={row._id}
              className="flex flex-wrap items-center justify-between gap-3 py-2"
            >
              <div className="flex flex-col">
                <span className="font-medium text-primary">{row.value}</span>
                <span className="text-xs text-primary/50">
                  {format.date(row._creationTime)}
                  {row.reason && ` · ${row.reason}`}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  run(() => unsuppress({ suppressionId: row._id }))
                }
              >
                {t("remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
