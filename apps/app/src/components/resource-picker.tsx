"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useDeferredValue, useState } from "react";
import { useFirm } from "@/components/firm-provider";
import { SearchInput } from "@/components/search-input";
import { formatUnit } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

export type Resource = Doc<"resources">;

/** Finds a Resursă in the catalog, the firm's own first, by the words of its name. */
export function ResourcePicker({
  kind,
  onPick,
  id,
}: {
  kind?: Resource["kind"];
  onPick: (resource: Resource) => void;
  id?: string;
}) {
  const t = useScopedI18n("resources");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const [text, setText] = useState("");
  const search = useDeferredValue(text.trim());
  const results = useQuery(
    api.catalog.resources.search,
    search ? { organizationId: firm._id, text: search, kind } : "skip",
  );
  return (
    <div className="grid gap-2">
      <SearchInput
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
      />
      {search && results?.length === 0 && (
        <p className="m-0 text-meta text-ink-3">{t("noResults")}</p>
      )}
      {results && results.length > 0 && (
        <ul className="m-0 grid max-h-56 list-none gap-0.5 overflow-y-auto rounded-md border border-border bg-card p-1">
          {results.map((resource) => (
            <li key={resource._id}>
              <button
                type="button"
                onClick={() => onPick(resource)}
                className="flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-body text-ink hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0 truncate">{resource.name}</span>
                <span className="shrink-0 text-meta text-ink-3">
                  {t(`kinds.${resource.kind}`)} ·{" "}
                  {formatUnit(resource.unit, locale)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
