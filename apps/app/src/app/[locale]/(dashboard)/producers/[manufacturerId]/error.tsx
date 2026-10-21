"use client";

import { Button } from "@devize/ui/button";
import { EmptyState } from "@devize/ui/empty-state";
import { Icons } from "@devize/ui/icons";
import Link from "next/link";
import { useScopedI18n } from "@/locales/client";

/** A link to a profile that never existed, such as a mistyped id. */
export default function ProfileError() {
  const t = useScopedI18n("producers.profile");
  return (
    <EmptyState
      icon={<Icons.Producers />}
      title={t("notFound")}
      action={
        <Button variant="outline" asChild>
          <Link href="/producers">{t("back")}</Link>
        </Button>
      }
    />
  );
}
