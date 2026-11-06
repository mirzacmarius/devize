"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useNormSource } from "@/components/norm-source";
import { useScopedI18n } from "@/locales/client";
import { useFormat } from "../_components/ui";

/**
 * Producer norms sent for verification, oldest first. Each opens on its own
 * page, where a super admin compares it with the producer's documents, then
 * publishes it or sends it back with a note.
 */
export default function ReviewPage() {
  const t = useScopedI18n("admin.review");
  const format = useFormat();
  const normSource = useNormSource();
  const norms = useQuery(api.catalog.norms.listForReview);
  const waiting = norms?.slice().sort((a, b) => a.updatedAt - b.updatedAt);

  return (
    <div className="flex w-full flex-col gap-6">
      <p className="m-0 max-w-3xl text-body text-ink-2">{t("description")}</p>
      {waiting === undefined ? (
        <Loader2 className="h-5 w-5 animate-spin text-ink-3" />
      ) : (
        <section className="w-full rounded-lg border border-card-border bg-card px-4 py-4 shadow-card sm:px-5">
          {waiting.length === 0 ? (
            <p className="text-body text-ink-3">{t("empty")}</p>
          ) : (
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border text-left text-caption text-ink-3">
                  <th className="py-2 pr-4 font-medium">{t("columns.norm")}</th>
                  <th className="hidden py-2 pr-4 font-medium md:table-cell">
                    {t("columns.source")}
                  </th>
                  <th className="py-2 text-right font-medium">
                    {t("columns.submitted")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {waiting.map((norm) => (
                  <tr
                    key={norm._id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2 pr-4">
                      <Link
                        href={`/catalog/${norm._id}`}
                        className="group flex flex-col"
                      >
                        <span className="text-meta tabular-nums text-ink-3">
                          {norm.version > 1
                            ? `${norm.code} · v${norm.version}`
                            : norm.code}
                        </span>
                        <span className="font-medium text-ink group-hover:underline">
                          {norm.title}
                        </span>
                      </Link>
                    </td>
                    <td className="hidden py-2 pr-4 text-ink-2 md:table-cell">
                      {normSource(norm)}
                    </td>
                    <td className="py-2 text-right text-ink-3 tabular-nums">
                      {format.date(norm.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
