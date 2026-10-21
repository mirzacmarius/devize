"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { useScopedI18n } from "@/locales/client";
import type { Norm } from "./types";

/** What the work includes and leaves out, and how it is measured. */
export function ScopeCard({ norm }: { norm: Norm }) {
  const t = useScopedI18n("norm");
  const notes = [
    { label: t("scope.includes"), text: norm.includes },
    { label: t("scope.excludes"), text: norm.excludes },
    { label: t("scope.measurement"), text: norm.measurement },
  ].filter((note) => note.text);
  if (notes.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("scope.title")}</CardTitle>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        <dl className="m-0 grid gap-4">
          {notes.map((note) => (
            <div key={note.label} className="grid gap-1">
              <dt className="text-label uppercase text-ink-3">{note.label}</dt>
              <dd className="m-0 whitespace-pre-line text-body text-ink-2">
                {note.text}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
