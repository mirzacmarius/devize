"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button, buttonVariants } from "@devize/ui/button";
import { Input } from "@devize/ui/input";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ExternalLink, Loader2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  ErrorText,
  Field,
  Panel,
  Pill,
  useFormat,
  useRun,
} from "../_components/ui";

const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

export default function AdminSettingsPage() {
  const t = useScopedI18n("admin.settings");
  const settings = useQuery(api.manufacturers.outreach.getSettings);

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-3xl font-medium text-primary/80">{t("title")}</h1>
      <ClaudeStatus />
      {settings === undefined ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
      ) : (
        <>
          <SenderForm settings={settings} />
          <PrivacyForm settings={settings} />
        </>
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

type Settings = FunctionReturnType<
  typeof api.manufacturers.outreach.getSettings
>;

function SenderForm({ settings }: { settings: Settings }) {
  const t = useScopedI18n("admin.settings.sender");
  const updateSettings = useMutation(api.manufacturers.outreach.updateSettings);
  const [firstName, setFirstName] = useState(settings.firstName ?? "");
  const [lastName, setLastName] = useState(settings.lastName ?? "");
  const [phone, setPhone] = useState(settings.phone ?? "");
  const [senderEmail, setSenderEmail] = useState(settings.senderEmail ?? "");
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
              updateSettings({ firstName, lastName, phone, senderEmail }),
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
        <Field label={t("senderEmail")} htmlFor="sender_email">
          <Input
            id="sender_email"
            type="email"
            value={senderEmail}
            aria-describedby="sender_email_hint"
            onChange={(event) => setSenderEmail(event.target.value)}
          />
          <p id="sender_email_hint" className="text-xs text-primary/50">
            {t("senderEmailHint")}
          </p>
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
      {settings.senderEmail && (
        <DomainCheck key={settings.senderEmail} email={settings.senderEmail} />
      )}
    </Panel>
  );
}

type DomainResult = FunctionReturnType<
  typeof api.manufacturers.mailbox.checkSenderDomain
>;

/**
 * Whether the saved mailbox's domain publishes SPF, DKIM and DMARC, which
 * keep a first email to a firm out of spam.
 */
function DomainCheck({ email }: { email: string }) {
  const t = useScopedI18n("admin.settings.sender.domain");
  const check = useAction(api.manufacturers.mailbox.checkSenderDomain);
  const [result, setResult] = useState<DomainResult | null>(null);
  const { run, error, pending } = useRun();

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-primary/70">{t("intro", { email })}</p>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(async () => setResult(await check()))}
        >
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {t("check")}
        </Button>
      </div>
      <ErrorText error={error} />
      {result?.outcome === "provider" && (
        <p className="text-sm text-primary/70">
          {t("provider", { domain: result.domain })}
        </p>
      )}
      {result?.outcome === "unavailable" && (
        <p className="text-sm text-primary/70">
          {t("unavailable", { domain: result.domain })}
        </p>
      )}
      {result?.outcome === "checked" && (
        <ul className="flex flex-col gap-2 text-sm">
          <DomainRow ok={result.spf} label="SPF">
            {result.spf ? t("spfOk") : t("spfMissing")}
          </DomainRow>
          <DomainRow ok={result.dkim !== null} label="DKIM">
            {result.dkim !== null
              ? t("dkimOk", { selector: result.dkim })
              : t("dkimMissing")}
          </DomainRow>
          <DomainRow ok={result.dmarc} label="DMARC">
            {result.dmarc ? t("dmarcOk") : t("dmarcMissing")}
          </DomainRow>
        </ul>
      )}
    </div>
  );
}

function DomainRow({
  ok,
  label,
  children,
}: {
  ok: boolean;
  label: string;
  children: ReactNode;
}) {
  const t = useScopedI18n("admin.settings.sender.domain");
  return (
    <li className="flex items-start gap-2">
      <Pill tone={ok ? "success" : "warning"}>
        {label} · {ok ? t("ok") : t("missing")}
      </Pill>
      <span className="text-primary/70">{children}</span>
    </li>
  );
}

/**
 * Who the privacy page names as answering for the data. The emails link to
 * that page unless another one is set here.
 */
function PrivacyForm({ settings }: { settings: Settings }) {
  const t = useScopedI18n("admin.settings.privacy");
  const updatePrivacy = useMutation(api.manufacturers.outreach.updatePrivacy);
  const { controller } = settings;
  const [controllerName, setName] = useState(controller.name ?? "");
  const [controllerRegistration, setRegistration] = useState(
    controller.registration ?? "",
  );
  const [controllerAddress, setAddress] = useState(controller.address ?? "");
  const [controllerEmail, setEmail] = useState(controller.email ?? "");
  const [privacyUrl, setPrivacyUrl] = useState(settings.privacyUrl ?? "");
  const [saved, setSaved] = useState(false);
  const { run, error, pending } = useRun();

  return (
    <Panel
      title={t("title")}
      description={t("description")}
      actions={
        <a
          href="/confidentialitate"
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          {t("open")}
          <ExternalLink aria-hidden />
        </a>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaved(
            await run(() =>
              updatePrivacy({
                controllerName,
                controllerRegistration,
                controllerAddress,
                controllerEmail,
                privacyUrl,
              }),
            ),
          );
        }}
      >
        <Field label={t("name")} htmlFor="privacy_name">
          <Input
            id="privacy_name"
            value={controllerName}
            placeholder={t("namePlaceholder")}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label={t("registration")} htmlFor="privacy_registration">
          <Input
            id="privacy_registration"
            value={controllerRegistration}
            placeholder={t("registrationPlaceholder")}
            onChange={(event) => setRegistration(event.target.value)}
          />
        </Field>
        <Field label={t("address")} htmlFor="privacy_address">
          <Input
            id="privacy_address"
            value={controllerAddress}
            onChange={(event) => setAddress(event.target.value)}
          />
        </Field>
        <Field label={t("email")} htmlFor="privacy_email">
          <Input
            id="privacy_email"
            type="email"
            value={controllerEmail}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label={t("url")} htmlFor="privacy_url">
          <Input
            id="privacy_url"
            type="url"
            value={privacyUrl}
            placeholder={settings.privacyPage ?? undefined}
            aria-describedby="privacy_url_hint"
            onChange={(event) => setPrivacyUrl(event.target.value)}
          />
          <p id="privacy_url_hint" className="text-xs text-primary/50">
            {t("urlHint")}
          </p>
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
