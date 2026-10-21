"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useState } from "react";
import { useFirm } from "@/components/firm-provider";
import {
  type Markups,
  MarkupsFields,
  parseMarkups,
  useMarkupsDraft,
} from "@/components/markups-fields";
import { useRun } from "@/components/use-run";
import { useScopedI18n } from "@/locales/client";

/** The firm's default Cote, which every new Deviz copies. */
export function MarkupsCard({ canEdit }: { canEdit: boolean }) {
  const { firm } = useFirm();
  const details = useQuery(api.accounts.organizations.get, {
    organizationId: firm._id,
  });
  if (!details) {
    return null;
  }
  return (
    <MarkupsForm
      // A new form when the saved values change elsewhere.
      key={JSON.stringify(details.defaultMarkups)}
      markups={details.defaultMarkups}
      vatPayer={details.vatPayer}
      canEdit={canEdit}
    />
  );
}

function MarkupsForm({
  markups,
  vatPayer,
  canEdit,
}: {
  markups: Markups;
  vatPayer: boolean;
  canEdit: boolean;
}) {
  const t = useScopedI18n("rates");
  const tc = useScopedI18n("common");
  const { firm } = useFirm();
  const update = useMutation(api.accounts.organizations.update);
  const run = useRun();
  const toDraft = useMarkupsDraft();
  const [draft, setDraft] = useState(() => toDraft(markups));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const defaultMarkups = parseMarkups(draft);
    if (!defaultMarkups) {
      setError(t("markupsInvalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    await run(
      () => update({ organizationId: firm._id, defaultMarkups }),
      t("markupsSaved"),
    );
    setSaving(false);
  };

  return (
    <Card>
      <form onSubmit={submit} noValidate>
        <CardHeader className="grid justify-stretch gap-1">
          <CardTitle>{t("markupsTitle")}</CardTitle>
          <CardDescription>{t("markupsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <MarkupsFields
            value={draft}
            onChange={setDraft}
            disabled={!canEdit}
            idPrefix="firm-markups"
            className="sm:grid-cols-1"
          />
          {!vatPayer && (
            <p className="m-0 text-meta text-ink-3">{t("notVatPayer")}</p>
          )}
          {error && (
            <p role="alert" className="m-0 text-meta text-danger">
              {error}
            </p>
          )}
        </CardContent>
        {canEdit && (
          <CardFooter>
            <Button type="submit" variant="secondary" disabled={saving}>
              {saving && <Icons.Loader className="animate-spin" aria-hidden />}
              {tc("save")}
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
