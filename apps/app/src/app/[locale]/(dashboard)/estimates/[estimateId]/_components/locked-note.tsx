"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { cn } from "@devize/ui/utils";
import { useMutation } from "convex/react";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";

/** A Deviz that can't change any more, and the way to change it: a revision. */
export function LockedNote({
  estimateId,
  label,
  className,
}: {
  estimateId: Id<"estimates">;
  label: string;
  className?: string;
}) {
  const t = useScopedI18n("estimate.actions");
  const router = useRouter();
  const run = useRun();
  const duplicate = useMutation(api.estimates.estimates.duplicate);
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    const result = await run(
      () => duplicate({ estimateId, asRevision: true }),
      t("revisionCreated"),
    );
    setBusy(false);
    if (result.ok) {
      router.push(`/estimates/${result.value}`);
    }
  };
  return (
    <p
      className={cn(
        "m-0 flex items-center gap-1.5 text-meta text-ink-3",
        className,
      )}
    >
      <Lock className="size-3.5 shrink-0" aria-hidden />
      {label}
      <span aria-hidden>·</span>
      <Button
        type="button"
        variant="link"
        className="text-meta"
        disabled={busy}
        onClick={create}
      >
        {t("createRevision")}
      </Button>
    </p>
  );
}
