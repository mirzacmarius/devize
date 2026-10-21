"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import { Button } from "@devize/ui/button";
import { useDoubleCheck } from "@devize/ui/utils";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useScopedI18n } from "@/locales/client";
import {
  ErrorText,
  ExternalLink,
  manufacturerTone,
  Pill,
  useRun,
} from "../../_components/ui";
import { ClaimPanel } from "./_components/claim-panel";
import { ContactsPanel } from "./_components/contacts-panel";
import { DetailsPanel } from "./_components/details-panel";
import { EmailPanel } from "./_components/email-panel";
import { ExcludePanel } from "./_components/exclude-panel";
import { FindingsPanel } from "./_components/findings-panel";
import { ImportsPanel } from "./_components/imports-panel";
import { JobsPanel } from "./_components/jobs-panel";

export default function ManufacturerPage() {
  const t = useScopedI18n("admin.manufacturer");
  const tAdmin = useScopedI18n("admin");
  const router = useRouter();
  const params = useParams<{ manufacturerId: string }>();
  const manufacturerId = params.manufacturerId as Id<"manufacturers">;
  const data = useQuery(api.manufacturers.admin.get, { manufacturerId });
  const startResearch = useMutation(api.manufacturers.admin.startResearch);
  const remove = useMutation(api.manufacturers.admin.remove);
  const { doubleCheck, getButtonProps } = useDoubleCheck();
  const { run, error, pending } = useRun();

  if (data === undefined) {
    return <Loader2 className="h-5 w-5 animate-spin text-primary/40" />;
  }
  if (data === null) {
    return <p className="text-sm text-primary/60">{t("notFound")}</p>;
  }

  const { manufacturer } = data;
  const researching = data.jobs.some(
    (job) =>
      job.kind === "manufacturer_research" &&
      (job.status === "queued" || job.status === "running"),
  );
  const [message, ...history] = data.messages.filter(
    (candidate) => candidate.step === "initial",
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <Link
        href="/admin/manufacturers"
        className="flex w-fit items-center gap-1 text-sm text-primary/60 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-medium text-primary/80">
            {manufacturer.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-primary/60">
            <Pill tone={manufacturerTone[manufacturer.status]}>
              {tAdmin(`status.manufacturer.${manufacturer.status}`)}
            </Pill>
            <span>{t("wave", { wave: manufacturer.wave })}</span>
            {manufacturer.website && (
              <ExternalLink href={manufacturer.website} />
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button
              disabled={researching || pending}
              onClick={() => run(() => startResearch({ manufacturerId }))}
            >
              {researching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("researching")}
                </>
              ) : manufacturer.researchedAt ? (
                t("researchAgain")
              ) : (
                t("research")
              )}
            </Button>
            <Button
              variant="destructive"
              {...getButtonProps({
                onClick: doubleCheck
                  ? () =>
                      run(async () => {
                        await remove({ manufacturerId });
                        router.push("/admin/manufacturers");
                      })
                  : undefined,
              })}
            >
              {doubleCheck ? t("deleteConfirm") : t("delete")}
            </Button>
          </div>
          <ErrorText error={error} />
        </div>
      </div>

      <div className="grid w-full gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <FindingsPanel manufacturer={manufacturer} research={data.research} />
          <ContactsPanel
            manufacturerId={manufacturerId}
            contacts={data.contacts}
            message={message}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <EmailPanel
            message={message}
            history={history}
            contacts={data.contacts}
          />
          <ImportsPanel
            manufacturerId={manufacturerId}
            normImports={data.normImports}
          />
          <ClaimPanel manufacturerId={manufacturerId} />
        </div>
      </div>

      <DetailsPanel manufacturer={manufacturer} />
      <JobsPanel jobs={data.jobs} />
      <ExcludePanel manufacturer={manufacturer} contacts={data.contacts} />
    </div>
  );
}
