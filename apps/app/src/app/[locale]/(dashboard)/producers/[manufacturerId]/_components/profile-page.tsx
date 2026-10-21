"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { MAX_PDF_PAGES } from "@devize/backend/convex/proposals/lib/input";
import { Badge } from "@devize/ui/badge";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import { StatusPill } from "@devize/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@devize/ui/table";
import { cn } from "@devize/ui/utils";
import { useMutation, useQuery } from "convex/react";
import { FileText, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { useFirm } from "@/components/firm-provider";
import { NormStatusPill } from "@/components/norm-status";
import { useRun } from "@/components/use-run";
import { formatDay, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { ClaimDialog } from "./claim-dialog";
import { DatasheetDialog } from "./datasheet-dialog";
import { DetailsDialog } from "./details-dialog";
import { ProducerHeader } from "./producer-header";
import { RemovalDialog } from "./removal-dialog";
import type { Profile, Reading } from "./types";

/**
 * A Producător's profile: what it says about itself, and the norms and
 * products it publishes in the catalog. Someone who works there claims it
 * from here, or asks Devize to take it down; once claimed, the producer's
 * firm writes its norms and its details from here.
 */
export function ProfilePage({
  manufacturerId,
}: {
  manufacturerId: Id<"manufacturers">;
}) {
  const t = useScopedI18n("producers");
  const tc = useScopedI18n("common");
  const { firm } = useFirm();
  const profile = useQuery(api.producers.profiles.get, { manufacturerId });
  // The data sheets Devize AI reads for the producer, for its own people.
  const readings = useQuery(
    api.producers.datasheets.list,
    profile?.viewer.isProducer ? { manufacturerId } : "skip",
  );
  const [dialog, setDialog] = useState<
    "claim" | "removal" | "details" | "datasheet" | null
  >(null);

  if (profile === undefined) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }
  if (profile === null) {
    return (
      <EmptyState
        icon={<Icons.Producers />}
        title={t("profile.notFound")}
        action={
          <Button variant="outline" asChild>
            <Link href="/producers">{t("profile.back")}</Link>
          </Button>
        }
      />
    );
  }

  const { viewer } = profile;
  const canAskToClaim = viewer.canClaim && viewer.claim?.status !== "pending";
  // Anyone can ask to take down a profile Devize made; a claimed one only
  // its own firm.
  const canAskRemoval =
    profile.visible &&
    !viewer.removalPending &&
    (!profile.claimed || viewer.isProducer);
  // The norm form writes for the firm the user works in, so only that firm
  // starts the producer's norms here.
  const writesNorms = firm.manufacturerId === profile._id;
  const details =
    profile.details && Object.values(profile.details).some(Boolean)
      ? profile.details
      : null;
  // A reading that made its draft shows as the draft itself.
  const pending = (readings ?? []).filter(
    (reading) => reading.status !== "done",
  );

  return (
    <>
      <ProducerHeader
        profile={profile}
        tab="profile"
        actions={
          writesNorms && (
            <>
              <Button variant="ai" onClick={() => setDialog("datasheet")}>
                <Icons.AI aria-hidden />
                {t("profile.fromDatasheet")}
              </Button>
              <Button asChild>
                <Link href="/catalog/new?for=producer">
                  <Plus aria-hidden />
                  {t("profile.newNorm")}
                </Link>
              </Button>
            </>
          )
        }
      />
      <ProfileNotices profile={profile} />
      {canAskToClaim && (
        <Notice
          action={
            <Button size="sm" onClick={() => setDialog("claim")}>
              {t("profile.claimAction")}
            </Button>
          }
        >
          <p className="m-0 text-body font-medium text-ink">
            {t("profile.claimTitle", { name: profile.name })}
          </p>
          <p className="m-0 text-body text-ink-2">
            {t("profile.claimDescription")}
          </p>
        </Notice>
      )}
      {(details || viewer.canEditDetails) && (
        <DetailsCard
          details={details}
          onEdit={
            viewer.canEditDetails ? () => setDialog("details") : undefined
          }
        />
      )}
      {(profile.drafts.length > 0 || pending.length > 0) && (
        <DraftsCard profile={profile} readings={pending} />
      )}
      <div
        className={
          profile.products.length > 0
            ? "grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]"
            : "grid gap-6"
        }
      >
        <NormsCard profile={profile} />
        {profile.products.length > 0 && <ProductsCard profile={profile} />}
      </div>
      {canAskRemoval && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialog("removal")}
          >
            {t("profile.removal")}
          </Button>
        </div>
      )}
      <ClaimDialog
        profile={profile}
        open={dialog === "claim"}
        onClose={() => setDialog(null)}
      />
      <RemovalDialog
        profile={profile}
        open={dialog === "removal"}
        onClose={() => setDialog(null)}
      />
      {viewer.canEditDetails && (
        <DetailsDialog
          profile={profile}
          open={dialog === "details"}
          onClose={() => setDialog(null)}
        />
      )}
      {writesNorms && (
        <DatasheetDialog
          open={dialog === "datasheet"}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}

function Notice({
  action,
  children,
}: {
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-border bg-sunken px-4 py-3">
      <div className="grid max-w-3xl gap-1">{children}</div>
      {action}
    </div>
  );
}

/** Where the profile and the viewer's own requests about it stand. */
function ProfileNotices({ profile }: { profile: Profile }) {
  const t = useScopedI18n("producers.profile");
  const locale = useCurrentLocale();
  const withdraw = useMutation(api.producers.claims.withdraw);
  const run = useRun();
  const [busy, setBusy] = useState(false);
  const { viewer } = profile;
  const claim = viewer.claim;

  const notices: { key: string; text: string; action?: ReactNode }[] = [];
  if (!profile.visible) {
    notices.push({ key: "hidden", text: t("notPublic") });
  }
  if (viewer.isProducer) {
    notices.push({ key: "yours", text: t("yours") });
  }
  if (claim?.status === "pending") {
    notices.push({
      key: "pending",
      text: t("claimPending", { date: formatDay(claim.createdAt, locale) }),
      action: (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await run(() => withdraw({ claimId: claim._id }), t("withdrawn"));
            setBusy(false);
          }}
        >
          {t("withdraw")}
        </Button>
      ),
    });
  }
  if (claim?.status === "rejected") {
    notices.push({
      key: "rejected",
      text: claim.reason
        ? t("claimRejected", { reason: claim.reason })
        : t("claimRejectedNoReason"),
    });
  }
  if (viewer.removalPending) {
    notices.push({ key: "removal", text: t("removalPending") });
  }

  return notices.map((notice) => (
    <Notice key={notice.key} action={notice.action}>
      <p className="m-0 text-body text-ink-2">{notice.text}</p>
    </Notice>
  ));
}

const linkClass =
  "rounded-xs underline-offset-[3px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * What the producer says about itself, and whom to ask technical questions.
 * Its owners edit it from here, and are asked to fill it in while it's empty.
 */
function DetailsCard({
  details,
  onEdit,
}: {
  details: NonNullable<Profile["details"]> | null;
  onEdit?: () => void;
}) {
  const t = useScopedI18n("producers");
  const rows: { label: string; value: ReactNode }[] = [
    ...(details?.website
      ? [
          {
            label: t("profile.website"),
            value: (
              <a
                href={details.website}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {details.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            ),
          },
        ]
      : []),
    ...(details?.contactName
      ? [{ label: t("profile.contact"), value: details.contactName }]
      : []),
    ...(details?.contactEmail
      ? [
          {
            label: t("detailsDialog.contactEmail"),
            value: (
              <a href={`mailto:${details.contactEmail}`} className={linkClass}>
                {details.contactEmail}
              </a>
            ),
          },
        ]
      : []),
    ...(details?.contactPhone
      ? [
          {
            label: t("detailsDialog.contactPhone"),
            value: (
              <a
                href={`tel:${details.contactPhone.replace(/[^\d+]/g, "")}`}
                className={cn(linkClass, "tabular-nums")}
              >
                {details.contactPhone}
              </a>
            ),
          },
        ]
      : []),
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.about")}</CardTitle>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil aria-hidden />
            {t("profile.editDetails")}
          </Button>
        )}
      </CardHeader>
      <TickRule />
      <CardContent
        className={cn(
          "grid gap-6 pt-4",
          details?.about &&
            rows.length > 0 &&
            "lg:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]",
        )}
      >
        {!details && (
          <p className="m-0 max-w-3xl text-body text-ink-3">
            {t("profile.noDetails")}
          </p>
        )}
        {details?.about && (
          <p className="m-0 max-w-3xl whitespace-pre-line text-body text-ink-2">
            {details.about}
          </p>
        )}
        {rows.length > 0 && (
          <dl className="m-0 grid content-start gap-3">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex min-w-0 items-baseline justify-between gap-4"
              >
                <dt className="shrink-0 text-body text-ink-3">{row.label}</dt>
                <dd className="m-0 min-w-0 text-right text-body font-medium text-ink [overflow-wrap:anywhere]">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The producer's norms still being written, or waiting for Devize to check
 * them, with the note on any Devize sent back; first, the data sheets Devize
 * AI is reading into drafts, or failed to.
 */
function DraftsCard({
  profile,
  readings,
}: {
  profile: Profile;
  readings: Reading[];
}) {
  const t = useScopedI18n("producers.profile");
  const tNorm = useScopedI18n("norm");
  return (
    <Card className="min-w-0">
      <CardHeader className="grid justify-stretch gap-1">
        <CardTitle>{t("drafts")}</CardTitle>
        <CardDescription>{t("draftsHint")}</CardDescription>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("normColumns.norm")}</TableHead>
              <TableHead>{t("normColumns.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {readings.map((reading) => (
              <ReadingRow key={reading._id} reading={reading} />
            ))}
            {profile.drafts.map((norm) => (
              <TableRow key={norm._id}>
                <TableCell>
                  <Link
                    href={`/catalog/${norm._id}`}
                    className="group grid gap-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-mono text-code text-ink-3">
                      {norm.code}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-body font-medium text-ink group-hover:underline">
                        {norm.title}
                      </span>
                      {norm.fromDatasheet && (
                        <Badge tone="ai">
                          <Icons.AI aria-hidden />
                          {t("fromDatasheet")}
                        </Badge>
                      )}
                    </span>
                    {norm.reviewNote && (
                      <span className="text-meta text-warning">
                        {tNorm("notices.reviewNote", { note: norm.reviewNote })}
                      </span>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <NormStatusPill status={norm.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Why a reading failed, from the code its job stored.
const failureReasons = {
  not_datasheet: "notDatasheet",
  not_pdf: "notPdf",
  too_many_pages: "tooManyPages",
  not_found: "deleted",
  forbidden: "forbidden",
  invalid_output: "incomplete",
  max_tokens: "incomplete",
  missing_api_key: "missingKey",
  api_key_rejected: "keyRejected",
  no_credit: "noCredit",
  timeout: "timeout",
  rate_limited: "busy",
  api_unreachable: "busy",
  api_unavailable: "busy",
  refusal: "refusal",
} as const;

function failureReason(code: string | undefined) {
  return (
    (code && failureReasons[code as keyof typeof failureReasons]) || "unknown"
  );
}

/** A data sheet Devize AI is reading, or failed to read, with what to do. */
function ReadingRow({ reading }: { reading: Reading }) {
  const t = useScopedI18n("producers.datasheet");
  const retry = useMutation(api.producers.datasheets.retry);
  const dismiss = useMutation(api.producers.datasheets.dismiss);
  const run = useRun();
  const [busy, setBusy] = useState(false);
  const failed = reading.status === "failed";
  const reason = failureReason(reading.error);

  const act = async (action: () => Promise<null>, success?: string) => {
    setBusy(true);
    await run(action, success);
    setBusy(false);
  };

  return (
    <TableRow>
      <TableCell>
        <div className="grid gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-ink-3" aria-hidden />
            <span className="truncate text-body font-medium text-ink">
              {reading.fileName ?? t("deletedFile")}
            </span>
          </span>
          {reading.work && (
            <span className="text-meta text-ink-3">{reading.work}</span>
          )}
          {failed ? (
            <span className="text-meta text-danger">
              {reason === "tooManyPages"
                ? t("reasons.tooManyPages", { max: MAX_PDF_PAGES })
                : t(`reasons.${reason}`)}
            </span>
          ) : (
            <span className="text-meta text-ai">{t("reading")}</span>
          )}
          {failed && (
            <span className="flex flex-wrap gap-2 pt-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  act(() => retry({ importId: reading._id }), t("retried"))
                }
              >
                {t("retry")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => act(() => dismiss({ importId: reading._id }))}
              >
                {t("dismiss")}
              </Button>
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <StatusPill tone={failed ? "danger" : "ai"}>
          {t(`statuses.${reading.status}`)}
        </StatusPill>
      </TableCell>
    </TableRow>
  );
}

function NormsCard({ profile }: { profile: Profile }) {
  const t = useScopedI18n("producers.profile");
  const tNorm = useScopedI18n("norm");
  const tNorms = useScopedI18n("norms");
  const locale = useCurrentLocale();
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("norms")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("normColumns.norm")}</TableHead>
              <TableHead>{t("normColumns.unit")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profile.norms.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-ink-3">
                  {t("noNorms")}
                </TableCell>
              </TableRow>
            )}
            {profile.norms.map((norm) => (
              <TableRow key={norm._id}>
                <TableCell>
                  <Link
                    href={`/catalog/${norm._id}`}
                    className="group grid gap-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-mono text-code text-ink-3">
                      {norm.code}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-body font-medium text-ink group-hover:underline">
                        {norm.title}
                      </span>
                      {norm.confirmed ? (
                        <Badge tone="success">
                          <Icons.Verified aria-hidden />
                          {tNorm("about.confirmed")}
                        </Badge>
                      ) : (
                        <Badge>{tNorms("unconfirmed")}</Badge>
                      )}
                    </span>
                    {norm.category && (
                      <span className="text-meta text-ink-3">
                        {norm.category}
                      </span>
                    )}
                  </Link>
                </TableCell>
                <TableCell className="text-ink-2">
                  {formatUnit(norm.unit, locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {profile.moreNorms && (
          <p className="m-0 pt-4 text-meta text-ink-3">{t("moreNorms")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ProductsCard({ profile }: { profile: Profile }) {
  const t = useScopedI18n("producers.profile");
  const locale = useCurrentLocale();
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("products")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("productColumns.name")}</TableHead>
              <TableHead>{t("productColumns.unit")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profile.products.map((product) => (
              <TableRow key={product._id}>
                <TableCell>
                  <div className="grid gap-0.5">
                    <span className="text-body font-medium text-ink">
                      {product.name}
                    </span>
                    {(product.brand || product.packageLabel) && (
                      <span className="text-meta text-ink-3">
                        {[product.brand, product.packageLabel]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-ink-2">
                  {formatUnit(product.unit, locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
