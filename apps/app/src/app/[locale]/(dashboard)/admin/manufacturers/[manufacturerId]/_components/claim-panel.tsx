"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { Input } from "@devize/ui/input";
import { toast } from "@devize/ui/sonner";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Copy, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, type ReactNode, useState } from "react";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";
import {
  Field,
  Panel,
  Pill,
  type Tone,
  useFormat,
} from "../../../_components/ui";

type ClaimData = NonNullable<
  FunctionReturnType<typeof api.producers.admin.forManufacturer>
>;

const claimTone: Record<string, Tone> = {
  pending: "warning",
  approved: "success",
  rejected: "neutral",
};

const removalTone: Record<string, Tone> = {
  pending: "warning",
  removed: "danger",
  dismissed: "neutral",
};

/**
 * Who holds the producer's public profile, and the two ways to hand it over
 * without a review: the producer's email domains and claim links.
 */
export function ClaimPanel({
  manufacturerId,
}: {
  manufacturerId: Id<"manufacturers">;
}) {
  const t = useScopedI18n("admin.manufacturer.claim");
  const data = useQuery(api.producers.admin.forManufacturer, {
    manufacturerId,
  });
  if (!data) {
    return null;
  }
  return (
    <Panel
      title={t("title")}
      description={t("description")}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href={`/producers/${manufacturerId}`}>{t("openProfile")}</Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-1 text-sm">
        <p className="text-primary/80">
          {data.holder
            ? t("claimedBy", { name: data.holder.name })
            : t("unclaimed")}
        </p>
        {!data.visible && <p className="text-primary/60">{t("notVisible")}</p>}
      </div>
      <Domains manufacturerId={manufacturerId} domains={data.domains} />
      <Links manufacturerId={manufacturerId} links={data.links} />
      <Requests data={data} />
    </Panel>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium text-primary">{title}</h3>
        {hint && <p className="text-xs text-primary/60">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Domains({
  manufacturerId,
  domains,
}: {
  manufacturerId: Id<"manufacturers">;
  domains: ClaimData["domains"];
}) {
  const t = useScopedI18n("admin.manufacturer.claim");
  const addDomain = useMutation(api.producers.admin.addDomain);
  const removeDomain = useMutation(api.producers.admin.removeDomain);
  const run = useRun();
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!domain.trim()) {
      return;
    }
    setBusy(true);
    const result = await run(() => addDomain({ manufacturerId, domain }));
    setBusy(false);
    if (result.ok) {
      setDomain("");
    }
  };

  return (
    <Section title={t("domains")} hint={t("domainsHint")}>
      {domains.length === 0 ? (
        <p className="text-sm text-primary/60">{t("noDomains")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {domains.map((row) => (
            <li
              key={row._id}
              className="flex items-center gap-1 rounded-full bg-primary/5 py-0.5 pl-3 pr-1 text-sm text-primary/80"
            >
              <span className="font-mono">{row.domain}</span>
              <button
                type="button"
                aria-label={t("removeDomain", { domain: row.domain })}
                className="rounded-full p-1 text-primary/60 hover:bg-primary/10 hover:text-primary"
                onClick={() => run(() => removeDomain({ domainId: row._id }))}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="flex flex-wrap items-end gap-2" onSubmit={submit}>
        <Field label={t("domain")} htmlFor="claim_domain">
          <Input
            id="claim_domain"
            className="w-60"
            value={domain}
            placeholder={t("domainPlaceholder")}
            onChange={(event) => setDomain(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="outline" disabled={busy}>
          {t("addDomain")}
        </Button>
      </form>
    </Section>
  );
}

function Links({
  manufacturerId,
  links,
}: {
  manufacturerId: Id<"manufacturers">;
  links: ClaimData["links"];
}) {
  const t = useScopedI18n("admin.manufacturer.claim");
  const format = useFormat();
  const createLink = useMutation(api.producers.admin.createLink);
  const revokeLink = useMutation(api.producers.admin.revokeLink);
  const run = useRun();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  // Read once: a link that expires while the page is open still shows valid.
  const [now] = useState(() => Date.now());

  // Links point at the production address when the backend knows it.
  const urlOf = (link: { url: string | null; token: string }) =>
    link.url ?? `${window.location.origin}/claim/${link.token}`;

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("copied"));
    } catch {
      // The link stays on screen to copy by hand.
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    setBusy(true);
    const result = await run(() => createLink({ manufacturerId, email }));
    setBusy(false);
    if (result.ok) {
      setEmail("");
      await copy(urlOf(result.value));
    }
  };

  return (
    <Section title={t("links")} hint={t("linksHint")}>
      {links.length === 0 ? (
        <p className="text-sm text-primary/60">{t("noLinks")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {links.map((link) => {
            const open = link.usedAt === undefined && link.expiresAt > now;
            return (
              <li
                key={link._id}
                className="flex flex-col gap-1 rounded-md border border-border px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-sm text-primary/80">
                      {link.email}
                    </span>
                    <span className="text-xs text-primary/60">
                      {link.usedAt !== undefined
                        ? t("linkUsed", { date: format.date(link.usedAt) })
                        : open
                          ? t("linkActive", {
                              date: format.date(link.expiresAt),
                            })
                          : t("linkExpired")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {open && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copy(urlOf(link))}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" aria-hidden />
                        {t("copy")}
                      </Button>
                    )}
                    <button
                      type="button"
                      aria-label={t("revoke", { email: link.email })}
                      className="rounded-full p-1.5 text-primary/60 hover:bg-primary/10 hover:text-primary"
                      onClick={() =>
                        run(() => revokeLink({ linkId: link._id }))
                      }
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
                {open && (
                  <span className="select-all break-all font-mono text-xs text-primary/60">
                    {urlOf(link)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <form className="flex flex-wrap items-end gap-2" onSubmit={submit}>
        <Field label={t("email")} htmlFor="claim_email">
          <Input
            id="claim_email"
            type="email"
            className="w-72"
            value={email}
            placeholder={t("emailPlaceholder")}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="outline" disabled={busy}>
          {t("createLink")}
        </Button>
      </form>
    </Section>
  );
}

function Requests({ data }: { data: ClaimData }) {
  const t = useScopedI18n("admin.manufacturer.claim");
  const format = useFormat();
  const waiting =
    data.claims.some((claim) => claim.status === "pending") ||
    data.removals.some((request) => request.status === "pending");
  return (
    <Section title={t("requests")}>
      {data.claims.length === 0 && data.removals.length === 0 ? (
        <p className="text-sm text-primary/60">{t("noRequests")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.claims.map((claim) => (
            <li
              key={claim._id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span className="text-primary/80">
                {[
                  claim.name ?? claim.email,
                  t(`methods.${claim.method}`),
                  format.date(claim.createdAt),
                ].join(" · ")}
              </span>
              <Pill tone={claimTone[claim.status]}>
                {t(`statuses.${claim.status}`)}
              </Pill>
            </li>
          ))}
          {data.removals.map((request) => (
            <li
              key={request._id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span className="text-primary/80">
                {[t("removal"), request.email, format.date(request.createdAt)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <Pill tone={removalTone[request.status]}>
                {t(`removalStatuses.${request.status}`)}
              </Pill>
            </li>
          ))}
        </ul>
      )}
      {waiting && (
        <Link
          href="/admin/claims"
          className="w-fit text-sm text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
        >
          {t("queue")}
        </Link>
      )}
    </Section>
  );
}
