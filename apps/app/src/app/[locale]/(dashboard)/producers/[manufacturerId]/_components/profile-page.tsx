"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Badge } from "@devize/ui/badge";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@devize/ui/breadcrumb";
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
import { PageHeader } from "@devize/ui/page-header";
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
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { useFirm } from "@/components/firm-provider";
import { NormStatusPill } from "@/components/norm-status";
import { useRun } from "@/components/use-run";
import { formatDay, formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { ClaimDialog } from "./claim-dialog";
import { DetailsDialog } from "./details-dialog";
import { RemovalDialog } from "./removal-dialog";
import type { Profile } from "./types";

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
  const tCatalog = useScopedI18n("catalog");
  const tc = useScopedI18n("common");
  const { firm } = useFirm();
  const profile = useQuery(api.producers.profiles.get, { manufacturerId });
  const [dialog, setDialog] = useState<"claim" | "removal" | "details" | null>(
    null,
  );

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
  const normsCount = profile.moreNorms
    ? `${profile.norms.length}+`
    : profile.norms.length;
  // The norm form writes for the firm the user works in, so only that firm
  // starts the producer's norms here.
  const writesNorms = firm.manufacturerId === profile._id;
  const details =
    profile.details && Object.values(profile.details).some(Boolean)
      ? profile.details
      : null;

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb aria-label={t("breadcrumb")}>
            <BreadcrumbLink asChild>
              <Link href="/catalog">{tCatalog("title")}</Link>
            </BreadcrumbLink>
            <BreadcrumbSeparator />
            <BreadcrumbLink asChild>
              <Link href="/producers">{t("title")}</Link>
            </BreadcrumbLink>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{profile.name}</BreadcrumbPage>
          </Breadcrumb>
        }
        thumb={
          profile.logoUrl ? (
            <img
              src={profile.logoUrl}
              alt=""
              className="size-full bg-card object-contain p-1"
            />
          ) : (
            <Icons.Producers />
          )
        }
        title={profile.name}
        status={
          <StatusPill tone={profile.claimed ? "success" : "neutral"}>
            {profile.claimed ? t("claimed") : t("unclaimed")}
          </StatusPill>
        }
        description={[
          profile.claimed
            ? t("profile.claimedLabel")
            : t("profile.unclaimedLabel"),
          profile.editions.length > 0 &&
            t("profile.editions", { editions: profile.editions.join(", ") }),
          t("profile.normsCount", { count: normsCount }),
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          (viewer.canEditDetails || writesNorms) && (
            <>
              {viewer.canEditDetails && (
                <Button variant="outline" onClick={() => setDialog("details")}>
                  <Pencil aria-hidden />
                  {t("profile.editDetails")}
                </Button>
              )}
              {writesNorms && (
                <Button asChild>
                  <Link href="/catalog/new?for=producer">
                    <Plus aria-hidden />
                    {t("profile.newNorm")}
                  </Link>
                </Button>
              )}
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
      {details && <DetailsCard details={details} />}
      {profile.drafts.length > 0 && <DraftsCard profile={profile} />}
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

/** What the producer says about itself, and whom to ask technical questions. */
function DetailsCard({
  details,
}: {
  details: NonNullable<Profile["details"]>;
}) {
  const t = useScopedI18n("producers");
  const rows: { label: string; value: ReactNode }[] = [
    ...(details.website
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
    ...(details.contactName
      ? [{ label: t("profile.contact"), value: details.contactName }]
      : []),
    ...(details.contactEmail
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
    ...(details.contactPhone
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
      </CardHeader>
      <TickRule />
      <CardContent
        className={cn(
          "grid gap-6 pt-4",
          details.about &&
            rows.length > 0 &&
            "lg:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]",
        )}
      >
        {details.about && (
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
 * them, with the note on any Devize sent back.
 */
function DraftsCard({ profile }: { profile: Profile }) {
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
                    <span className="text-body font-medium text-ink group-hover:underline">
                      {norm.title}
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
