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
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium text-primary/80">{t("title")}</h1>
        <p className="max-w-3xl text-base text-primary/60">
          {t("description")}
        </p>
      </div>
      {waiting === undefined ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
      ) : (
        <section className="w-full rounded-lg border border-border bg-card px-6 py-5">
          {waiting.length === 0 ? (
            <p className="text-sm text-primary/60">{t("empty")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-primary/60">
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
                        <span className="font-mono text-xs text-primary/60">
                          {norm.version > 1
                            ? `${norm.code} · v${norm.version}`
                            : norm.code}
                        </span>
                        <span className="font-medium text-primary group-hover:underline">
                          {norm.title}
                        </span>
                      </Link>
                    </td>
                    <td className="hidden py-2 pr-4 text-primary/70 md:table-cell">
                      {normSource(norm)}
                    </td>
                    <td className="py-2 text-right text-primary/60 tabular-nums">
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
