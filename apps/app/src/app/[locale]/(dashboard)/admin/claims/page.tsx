"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";
import { Field, Panel, Pill, Textarea, useFormat } from "../_components/ui";

type Queue = FunctionReturnType<typeof api.producers.admin.queue>;
type Claim = Queue["claims"][number];
type Removal = Queue["removals"][number];

/**
 * Claims of producers' profiles and requests to take one down, waiting for a
 * super admin. Claims by link or by domain never wait here.
 */
export default function ClaimsPage() {
  const t = useScopedI18n("admin.claims");
  const queue = useQuery(api.producers.admin.queue);
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium text-primary/80">{t("title")}</h1>
        <p className="max-w-3xl text-base text-primary/60">
          {t("description")}
        </p>
      </div>
      {queue === undefined ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
      ) : (
        <>
          <Panel title={t("claims")}>
            {queue.claims.length === 0 ? (
              <p className="text-sm text-primary/60">{t("claimsEmpty")}</p>
            ) : (
              queue.claims.map((claim) => (
                <ClaimRow key={claim._id} claim={claim} />
              ))
            )}
          </Panel>
          <Panel title={t("removals")}>
            {queue.removals.length === 0 ? (
              <p className="text-sm text-primary/60">{t("removalsEmpty")}</p>
            ) : (
              queue.removals.map((request) => (
                <RemovalRow key={request._id} request={request} />
              ))
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function Who({
  manufacturerId,
  manufacturerName,
  name,
  email,
  createdAt,
}: {
  manufacturerId: string;
  manufacturerName: string;
  name: string | null;
  email?: string;
  createdAt: number;
}) {
  const t = useScopedI18n("admin.claims");
  const format = useFormat();
  return (
    <div className="flex flex-col gap-1">
      <Link
        href={`/admin/manufacturers/${manufacturerId}`}
        className="w-fit text-base font-medium text-primary hover:underline"
      >
        {manufacturerName}
      </Link>
      <p className="text-sm text-primary/60">
        {[name, email, t("sent", { date: format.date(createdAt) })]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );
}

function Message({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap rounded-md bg-primary/5 px-3 py-2 text-sm text-primary/80">
      {text}
    </p>
  );
}

function ClaimRow({ claim }: { claim: Claim }) {
  const t = useScopedI18n("admin.claims");
  const run = useRun();
  const approve = useMutation(api.producers.admin.approve);
  const checkAnaf = useMutation(api.producers.admin.checkAnaf);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const claimant = claim.firmName ?? claim.name ?? claim.email;

  const act = async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    await run(action, success);
    setBusy(false);
  };

  return (
    <article className="flex flex-col gap-3 border-b border-border pb-5 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Who
          manufacturerId={claim.manufacturerId}
          manufacturerName={claim.manufacturerName}
          name={claim.name}
          email={claim.email}
          createdAt={claim.createdAt}
        />
        {claim.claimed && <Pill tone="warning">{t("alreadyClaimed")}</Pill>}
      </div>
      {claim.firmName && (
        <p className="text-sm text-primary/70">
          {t("firm", { name: claim.firmName })}
        </p>
      )}
      {claim.message && <Message text={claim.message} />}
      {claim.cui && (
        <div className="flex flex-col gap-2 rounded-md border border-border px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-sm text-primary/80">
              {t("cui", { cui: claim.cui })}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => act(() => checkAnaf({ claimId: claim._id }))}
            >
              {t("anaf.check")}
            </Button>
          </div>
          <AnafRecord claim={claim} />
        </div>
      )}
      <Signals claim={claim} />
      <p className="text-xs text-primary/50">{t("caution")}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy || claim.claimed}
          onClick={() =>
            act(
              () => approve({ claimId: claim._id }),
              t("approved", { name: claimant }),
            )
          }
        >
          {t("approve")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setRejecting(true)}
        >
          {t("reject")}
        </Button>
      </div>
      <RejectDialog
        claim={claim}
        open={rejecting}
        onClose={() => setRejecting(false)}
      />
    </article>
  );
}

function AnafRecord({ claim }: { claim: Claim }) {
  const t = useScopedI18n("admin.claims.anaf");
  const anaf = claim.anaf;
  if (!anaf) {
    return <p className="text-sm text-primary/60">{t("waiting")}</p>;
  }
  if (anaf.outcome === "not_found") {
    return <p className="text-sm text-primary/70">{t("notFound")}</p>;
  }
  if (anaf.outcome === "unavailable") {
    return <p className="text-sm text-primary/60">{t("unavailable")}</p>;
  }
  return (
    <div className="flex flex-col gap-1 text-sm text-primary/80">
      <p className="font-medium">{anaf.name}</p>
      {anaf.address && <p className="text-primary/70">{anaf.address}</p>}
      <p className="text-primary/60">
        {[anaf.tradeRegister, anaf.registration].filter(Boolean).join(" · ")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Pill tone={anaf.inactive ? "danger" : "success"}>
          {anaf.inactive ? t("inactive") : t("active")}
        </Pill>
        {anaf.vatPayer !== undefined && (
          <Pill tone="neutral">
            {anaf.vatPayer ? t("vatPayer") : t("notVatPayer")}
          </Pill>
        )}
      </div>
    </div>
  );
}

/** Hints for checking the claim by hand, each a match or a mismatch. */
function Signals({ claim }: { claim: Claim }) {
  const t = useScopedI18n("admin.claims.signals");
  const { signals } = claim;
  const rows = [
    signals.emailMatchesWebsite
      ? { key: "email", ok: true, text: t("emailMatchesWebsite") }
      : { key: "email", ok: false, text: t("emailOtherDomain") },
    signals.anafNameMatches !== null && {
      key: "anaf",
      ok: signals.anafNameMatches,
      text: signals.anafNameMatches
        ? t("anafNameMatches")
        : t("anafNameDiffers"),
    },
    signals.cuiMatches !== null && {
      key: "cui",
      ok: signals.cuiMatches,
      text: signals.cuiMatches ? t("cuiMatches") : t("cuiDiffers"),
    },
  ].filter((row) => row !== false);
  return (
    <div className="flex flex-wrap gap-1.5">
      {rows.map((row) => (
        <Pill key={row.key} tone={row.ok ? "success" : "warning"}>
          {row.text}
        </Pill>
      ))}
    </div>
  );
}

function RejectDialog({
  claim,
  open,
  onClose,
}: {
  claim: Claim;
  open: boolean;
  onClose: () => void;
}) {
  const t = useScopedI18n("admin.claims");
  const tc = useScopedI18n("common");
  const reject = useMutation(api.producers.admin.reject);
  const run = useRun();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await run(
      () => reject({ claimId: claim._id, reason: reason.trim() || undefined }),
      t("rejected"),
    );
    setSaving(false);
    if (result.ok) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>
            {t("rejectTitle", { name: claim.name ?? claim.email })}
          </DialogTitle>
          <DialogDescription>{t("rejectDescription")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={submit}>
          <Field label={t("reason")} htmlFor={`reject-${claim._id}`}>
            <Textarea
              id={`reject-${claim._id}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("reasonPlaceholder")}
              maxLength={500}
              rows={3}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={saving}>
              {t("reject")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemovalRow({ request }: { request: Removal }) {
  const t = useScopedI18n("admin.claims");
  const run = useRun();
  const remove = useMutation(api.producers.admin.remove);
  const dismiss = useMutation(api.producers.admin.dismiss);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const name = request.manufacturerName;

  const act = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    const result = await run(action, success);
    setBusy(false);
    if (result.ok) {
      setConfirming(false);
    }
  };

  return (
    <article className="flex flex-col gap-3 border-b border-border pb-5 last:border-0 last:pb-0">
      <Who
        manufacturerId={request.manufacturerId}
        manufacturerName={name}
        name={request.name}
        email={request.email}
        createdAt={request.createdAt}
      />
      <Message text={request.message} />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => setConfirming(true)}
        >
          {t("remove")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            act(() => dismiss({ requestId: request._id }), t("dismissed"))
          }
        >
          {t("dismiss")}
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("removeTitle", { name })}
        description={t("removeDescription")}
        confirm={t("remove")}
        destructive
        busy={busy}
        onConfirm={() =>
          act(() => remove({ requestId: request._id }), t("removed", { name }))
        }
      />
    </article>
  );
}
