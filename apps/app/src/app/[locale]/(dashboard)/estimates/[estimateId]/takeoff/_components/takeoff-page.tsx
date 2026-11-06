"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@devize/ui/breadcrumb";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { PageHeader } from "@devize/ui/page-header";
import { useQuery } from "convex/react";
import { Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  type DocumentsFormat,
  useDownloadDocuments,
} from "@/components/documents/use-download-documents";
import { useRouteParam } from "@/components/use-route-param";
import { estimateCode } from "@/lib/format";
import { useScopedI18n } from "@/locales/client";
import { ItemsCard } from "./items-card";
import { RoomDialog } from "./room-dialog";
import { RoomsCard } from "./rooms-card";
import { RoomsTakeoffDialog } from "./rooms-takeoff-dialog";
import { SummaryCard } from "./summary-card";
import { TakeoffDialog } from "./takeoff-dialog";
import type { Room, Target } from "./types";

type Panel =
  | { kind: "room"; room: Room | "new" }
  | { kind: "rows"; target: Target }
  | { kind: "fromRooms"; target: Target };

/**
 * The Antemăsurătoare of a Deviz: its Camere with their dimensions and
 * openings, and its Articole with the rows behind their quantities, typed
 * by hand or written from the rooms. The appendix downloads from here.
 */
export function TakeoffPage() {
  const estimateId = useRouteParam("estimateId") as Id<"estimates">;
  const t = useScopedI18n("takeoff");
  const tEstimate = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  const data = useQuery(api.takeoffs.page.forEstimate, { estimateId });
  // The Deviz as the documents read it, for the appendix.
  const estimate = useQuery(api.estimates.estimates.get, { estimateId });
  const [panel, setPanel] = useState<Panel | null>(null);
  const close = () => setPanel(null);

  if (data === undefined) {
    return <p className="m-0 text-body text-ink-3">{tc("loading")}</p>;
  }

  const code = estimateCode(data.estimate.number, data.estimate.revision);
  const locked = data.estimate.locked;
  const measured =
    data.rooms.length > 0 ||
    data.items.some((item) => item.takeoffs.length > 0);

  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb aria-label={tEstimate("breadcrumb")}>
            <BreadcrumbLink asChild>
              <Link href="/estimates">{tEstimate("breadcrumbList")}</Link>
            </BreadcrumbLink>
            <BreadcrumbSeparator />
            <BreadcrumbLink asChild>
              <Link href={`/estimates/${estimateId}`}>{code}</Link>
            </BreadcrumbLink>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{t("breadcrumb")}</BreadcrumbPage>
          </Breadcrumb>
        }
        title={t("title")}
        description={t("description", { code, title: data.estimate.title })}
        actions={
          estimate && measured && <AppendixButtons estimate={estimate} />
        }
      />
      <div className="grid min-w-0 gap-6">
        <SummaryCard data={data} />
        <RoomsCard
          estimateId={estimateId}
          rooms={data.rooms}
          locked={locked}
          onAdd={() => setPanel({ kind: "room", room: "new" })}
          onEdit={(room) => setPanel({ kind: "room", room })}
        />
        <ItemsCard
          sections={data.sections}
          items={data.items}
          orphans={data.orphans}
          rooms={data.rooms}
          locked={locked}
          onRows={(target) => setPanel({ kind: "rows", target })}
          onFromRooms={(target) => setPanel({ kind: "fromRooms", target })}
        />
      </div>
      <RoomDialog
        estimateId={estimateId}
        room={panel?.kind === "room" ? panel.room : null}
        onClose={close}
      />
      <TakeoffDialog
        target={panel?.kind === "rows" ? panel.target : null}
        onClose={close}
      />
      <RoomsTakeoffDialog
        target={panel?.kind === "fromRooms" ? panel.target : null}
        rooms={data.rooms}
        onClose={close}
      />
    </>
  );
}

/** Downloads the Anexă · Antemăsurătoare as a PDF or an Excel workbook. */
function AppendixButtons({
  estimate,
}: {
  estimate: NonNullable<
    ReturnType<typeof useQuery<typeof api.estimates.estimates.get>>
  >;
}) {
  const t = useScopedI18n("takeoff");
  const tDocuments = useScopedI18n("documents");
  const download = useDownloadDocuments(estimate);
  const [downloading, setDownloading] = useState<DocumentsFormat>();
  const save = async (format: DocumentsFormat) => {
    setDownloading(format);
    await download(
      ["AM"],
      { withValues: true },
      tDocuments("appendix.title"),
      format,
    );
    setDownloading(undefined);
  };
  return (
    <>
      {(["pdf", "xlsx"] as const).map((format) => (
        <Button
          key={format}
          variant="outline"
          disabled={downloading !== undefined}
          onClick={() => void save(format)}
        >
          {downloading === format ? (
            <Icons.Loader className="animate-spin" aria-hidden />
          ) : (
            <Download aria-hidden />
          )}
          {t(`download.${format}`)}
        </Button>
      ))}
    </>
  );
}
