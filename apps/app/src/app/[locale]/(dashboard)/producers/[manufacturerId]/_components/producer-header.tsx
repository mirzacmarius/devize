"use client";

import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@devize/ui/breadcrumb";
import { Icons } from "@devize/ui/icons";
import { PageHeader } from "@devize/ui/page-header";
import { StatusPill } from "@devize/ui/status-pill";
import { TabsNav, TabsNavLink } from "@devize/ui/tabs-nav";
import Link from "next/link";
import type { ReactNode } from "react";
import { useScopedI18n } from "@/locales/client";
import type { Profile } from "./types";

/**
 * The top of a Producător's pages: who it is and whether it claimed its
 * profile. Its own firm and Devize staff also get the tabs between the
 * profile and its usage statistics.
 */
export function ProducerHeader({
  profile,
  tab,
  actions,
}: {
  profile: Profile;
  tab: "profile" | "stats";
  actions?: ReactNode;
}) {
  const t = useScopedI18n("producers");
  const tCatalog = useScopedI18n("catalog");
  const normsCount = profile.moreNorms
    ? `${profile.norms.length}+`
    : profile.norms.length;
  const href = `/producers/${profile._id}`;

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
        actions={actions}
      />
      {profile.viewer.canSeeStats && (
        <TabsNav aria-label={t("tabs.label")}>
          <TabsNavLink asChild active={tab === "profile"}>
            <Link href={href}>{t("tabs.profile")}</Link>
          </TabsNavLink>
          <TabsNavLink asChild active={tab === "stats"}>
            <Link href={`${href}/stats`}>{t("tabs.stats")}</Link>
          </TabsNavLink>
        </TabsNav>
      )}
    </>
  );
}
