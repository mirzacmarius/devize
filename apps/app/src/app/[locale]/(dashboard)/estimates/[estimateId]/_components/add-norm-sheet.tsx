"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  type BaseCategoryKey,
  baseCategoryByKey,
} from "@devize/backend/convex/catalog/baseCategories";
import { MAX_DESCRIPTION } from "@devize/backend/convex/catalog/lib/aiNorm";
import { AISuggestion } from "@devize/ui/ai-suggestion";
import { Badge } from "@devize/ui/badge";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@devize/ui/sheet";
import { toast } from "@devize/ui/sonner";
import { Textarea } from "@devize/ui/textarea";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useDeferredValue,
  useId,
  useState,
} from "react";
import { DecimalInput } from "@/components/decimal-input";
import { Field } from "@/components/field";
import { NormCategoryChips } from "@/components/norm-category-chips";
import { useNormSource } from "@/components/norm-source";
import { SearchInput } from "@/components/search-input";
import { useErrorMessage } from "@/components/use-error-message";
import { useRun } from "@/components/use-run";
import { appErrorOf } from "@/lib/errors";
import {
  formatConsumption,
  formatPercent,
  formatUnit,
  parseDecimal,
} from "@/lib/format";
import { resourceKinds } from "@/lib/resource-values";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { SectionSelect } from "./section-select";
import type { Estimate } from "./types";

/**
 * Finds norms by code, by the words of the work or by category of the base
 * catalog, and adds them to the Deviz with a quantity. It stays open, so
 * several items go in one after another. A work the catalog lacks gets a
 * norm written by Devize AI, for the firm.
 */
export function AddNormSheet({
  estimate,
  open,
  sectionId,
  onClose,
  onCustom,
}: {
  estimate: Estimate;
  open: boolean;
  sectionId: Id<"sections"> | undefined;
  onClose: () => void;
  onCustom: (sectionId: Id<"sections"> | undefined) => void;
}) {
  const t = useScopedI18n("estimate");
  const tc = useScopedI18n("common");
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        closeLabel={tc("close")}
        className="w-full overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>{t("addNorm.title")}</SheetTitle>
          <SheetDescription>{t("addNorm.description")}</SheetDescription>
        </SheetHeader>
        {open && (
          <AddNorm
            estimate={estimate}
            initialSectionId={sectionId}
            onCustom={onCustom}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// What the sheet shows: the search, one norm found, or the norm Devize AI
// writes (its form, then the request as it goes).
type View =
  | { kind: "search" }
  | { kind: "norm"; normId: Id<"norms"> }
  | { kind: "ai" };

function AddNorm({
  estimate,
  initialSectionId,
  onCustom,
}: {
  estimate: Estimate;
  initialSectionId: Id<"sections"> | undefined;
  onCustom: (sectionId: Id<"sections"> | undefined) => void;
}) {
  const t = useScopedI18n("estimate");
  const locale = useCurrentLocale();
  const normSource = useNormSource();
  const [text, setText] = useState("");
  const [view, setView] = useState<View>({ kind: "search" });
  const [categoryKey, setCategoryKey] = useState<BaseCategoryKey | null>(null);
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [added, setAdded] = useState(0);
  // The request Devize AI is writing or wrote, kept while the sheet is open,
  // so a look back at the search doesn't lose it.
  const [requestId, setRequestId] = useState<Id<"normRequests">>();
  const search = useDeferredValue(text.trim());
  const category = baseCategoryByKey(categoryKey);
  // Words typed search the whole catalog, within the category when one is
  // pressed; a category alone lists its base norms in the order of their codes.
  const found = useQuery(
    api.catalog.norms.search,
    search
      ? {
          organizationId: estimate.organizationId,
          text: search,
          category: category?.name,
          limit: 30,
        }
      : "skip",
  );
  const inCategory = useQuery(
    api.catalog.norms.listBaseCategory,
    !search && category ? { category: category.key } : "skip",
  );
  const results = search ? found : category ? inCategory : undefined;

  const onAdded = () => {
    setAdded((count) => count + 1);
    setView({ kind: "search" });
  };

  return (
    <div className="grid gap-4">
      {added > 0 && (
        <p className="m-0 flex items-center gap-2 text-meta text-success">
          <Icons.Check className="size-4" aria-hidden />
          {t("addNorm.addedCount", { count: added })}
        </p>
      )}
      {view.kind === "norm" ? (
        <NormPreview
          estimate={estimate}
          normId={view.normId}
          sectionId={sectionId}
          onSectionChange={setSectionId}
          onBack={() => setView({ kind: "search" })}
          onAdded={onAdded}
        />
      ) : view.kind === "ai" ? (
        <AiNorm
          estimate={estimate}
          initialText={search}
          requestId={requestId}
          onRequest={setRequestId}
          sectionId={sectionId}
          onSectionChange={setSectionId}
          onBack={() => setView({ kind: "search" })}
          onAdded={() => {
            setRequestId(undefined);
            onAdded();
          }}
        />
      ) : (
        <>
          <SearchInput
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("addNorm.searchPlaceholder")}
            aria-label={t("addNorm.searchPlaceholder")}
            autoFocus
          />
          <NormCategoryChips
            label={t("addNorm.categories")}
            allLabel={t("addNorm.allCategories")}
            value={categoryKey}
            onChange={setCategoryKey}
          />
          {!search && !category ? (
            <p className="m-0 text-meta text-ink-3">{t("addNorm.hint")}</p>
          ) : results === undefined ? (
            <p className="m-0 text-meta text-ink-3">{t("addNorm.searching")}</p>
          ) : results.length === 0 ? (
            search ? (
              <div className="grid justify-items-start gap-3">
                <p className="m-0 text-meta text-ink-3">
                  {t("addNorm.noResults", { text: search })}
                </p>
                <Button
                  type="button"
                  variant="ai"
                  onClick={() => setView({ kind: "ai" })}
                >
                  <Icons.AI aria-hidden />
                  {t("addNorm.ai.offer")}
                </Button>
              </div>
            ) : (
              <p className="m-0 text-meta text-ink-3">
                {t("addNorm.categoryEmpty", {
                  category: category?.name ?? "",
                })}
              </p>
            )
          ) : (
            <ul
              aria-label={t("addNorm.results")}
              className="m-0 grid list-none gap-0.5 p-0"
            >
              {results.map((norm) => (
                <li key={norm._id}>
                  <button
                    type="button"
                    onClick={() => setView({ kind: "norm", normId: norm._id })}
                    className="grid w-full gap-0.5 rounded-md px-3 py-2.5 text-left hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-code text-ink-2">
                        {norm.code}
                      </span>
                      <span className="shrink-0 text-meta text-ink-3">
                        {formatUnit(norm.unit, locale)}
                      </span>
                    </span>
                    <span className="text-body text-ink">{norm.title}</span>
                    <span className="text-meta text-ink-3">
                      {normSource(norm)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid justify-items-start gap-1">
            {requestId ? (
              <Button
                type="button"
                variant="link"
                className="text-ai"
                onClick={() => setView({ kind: "ai" })}
              >
                <Icons.AI aria-hidden />
                {t("addNorm.ai.resume")}
              </Button>
            ) : (
              (results?.length ?? 0) > 0 && (
                <Button
                  type="button"
                  variant="link"
                  className="text-ai"
                  onClick={() => setView({ kind: "ai" })}
                >
                  <Icons.AI aria-hidden />
                  {t("addNorm.ai.offerMore")}
                </Button>
              )
            )}
            <Button
              type="button"
              variant="link"
              onClick={() => onCustom(sectionId)}
            >
              {t("addNorm.custom")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// Why a request failed, from the code its job stored, as the sheet explains it.
const failureReasons = {
  not_work: "not_work",
  invalid_output: "invalid_output",
  max_tokens: "max_tokens",
  missing_api_key: "missing_api_key",
  api_key_rejected: "api_key_rejected",
  no_credit: "no_credit",
  timeout: "timeout",
  rate_limited: "busy",
  api_unreachable: "busy",
  api_unavailable: "busy",
  refusal: "refusal",
} as const;

function failureReason(code: string | undefined) {
  return (
    (code && failureReasons[code as keyof typeof failureReasons]) || "unknown"
  );
}

/**
 * The norm Devize AI writes for a work the catalog lacks: the firm describes
 * it, the request runs in the background, and the draft shows as any norm
 * would, with what the model assumed above the quantity. Adding it publishes
 * the norm among the firm's own.
 */
function AiNorm({
  estimate,
  initialText,
  requestId,
  onRequest,
  sectionId,
  onSectionChange,
  onBack,
  onAdded,
}: {
  estimate: Estimate;
  initialText: string;
  requestId: Id<"normRequests"> | undefined;
  onRequest: (requestId: Id<"normRequests"> | undefined) => void;
  sectionId: Id<"sections"> | undefined;
  onSectionChange: (sectionId: Id<"sections"> | undefined) => void;
  onBack: () => void;
  onAdded: () => void;
}) {
  const t = useScopedI18n("estimate");
  const ids = useId();
  const errorMessage = useErrorMessage();
  const run = useRun();
  const start = useMutation(api.catalog.aiNorms.start);
  const addToEstimate = useMutation(api.catalog.aiNorms.addToEstimate);
  const removeDraft = useMutation(api.catalog.norms.removeDraft);
  const request = useQuery(
    api.catalog.aiNorms.get,
    requestId ? { requestId } : "skip",
  );
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string>();
  const [starting, setStarting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const description = text.trim();
    if (!description) {
      setError(t("addNorm.ai.workRequired"));
      return;
    }
    setError(undefined);
    setStarting(true);
    try {
      onRequest(
        await start({
          organizationId: estimate.organizationId,
          description,
          estimateId: estimate._id,
        }),
      );
    } catch (failure) {
      toast.error(
        appErrorOf(failure)?.code === "rate_limited"
          ? t("addNorm.ai.rateLimited")
          : errorMessage(failure),
      );
    }
    setStarting(false);
  };

  const back = (
    <Button
      type="button"
      variant="link"
      className="justify-self-start"
      onClick={onBack}
    >
      <ArrowLeft aria-hidden />
      {t("addNorm.back")}
    </Button>
  );

  if (!requestId) {
    return (
      <form className="grid gap-4" onSubmit={submit} noValidate>
        {back}
        <div className="grid gap-1">
          <span className="flex items-center gap-2">
            <h3 className="m-0 text-title-card text-ink">
              {t("addNorm.ai.title")}
            </h3>
            <Badge tone="ai">
              <Icons.AI aria-hidden />
              Devize AI
            </Badge>
          </span>
          <p className="m-0 text-body text-ink-2">
            {t("addNorm.ai.description")}
          </p>
        </div>
        <Field
          label={t("addNorm.ai.work")}
          htmlFor={`${ids}-work`}
          hint={t("addNorm.ai.workHint", { max: MAX_DESCRIPTION })}
          error={error}
        >
          <Textarea
            id={`${ids}-work`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("addNorm.ai.workPlaceholder")}
            maxLength={MAX_DESCRIPTION}
            rows={3}
            aria-invalid={error !== undefined}
            autoFocus
          />
        </Field>
        <p className="m-0 text-meta text-ink-3">{t("addNorm.ai.privacy")}</p>
        <Button
          type="submit"
          variant="ai"
          className="justify-self-end"
          disabled={starting}
        >
          {starting ? (
            <Icons.Loader className="animate-spin" aria-hidden />
          ) : (
            <Icons.AI aria-hidden />
          )}
          {t("addNorm.ai.submit")}
        </Button>
      </form>
    );
  }

  if (request === undefined || request.status === "writing") {
    return (
      <div className="grid gap-4">
        {back}
        <AISuggestion title={t("addNorm.ai.writing")}>
          <p className="m-0 flex items-center gap-2 text-ink-2">
            <Icons.Loader className="size-4 animate-spin" aria-hidden />
            {t("addNorm.ai.writingHint")}
          </p>
        </AISuggestion>
      </div>
    );
  }

  if (request.status === "failed" || !request.norm) {
    return (
      <div className="grid gap-4">
        {back}
        <div className="grid justify-items-start gap-3">
          <p role="alert" className="m-0 text-body text-danger">
            {t(`addNorm.ai.failed.${failureReason(request.error)}`)}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => onRequest(undefined)}
          >
            {t("addNorm.ai.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const normId = request.norm._id;
  const discard = async () => {
    const result = await run(
      () => removeDraft({ normId }),
      t("addNorm.ai.discarded"),
    );
    if (result.ok) {
      onRequest(undefined);
    }
  };

  return (
    <NormPreview
      estimate={estimate}
      normId={normId}
      sectionId={sectionId}
      onSectionChange={onSectionChange}
      onBack={onBack}
      onAdded={onAdded}
      add={(quantity) =>
        addToEstimate({
          requestId: request._id,
          estimateId: estimate._id,
          quantity,
          sectionId,
        })
      }
      addLabel={t("addNorm.ai.addAndPublish")}
      addedMessage={(code) => t("addNorm.ai.published", { code })}
      notes={
        <AISuggestion title={t("addNorm.ai.done")}>
          <div className="grid gap-3">
            {request.assumptions.length > 0 && (
              <div className="grid gap-1">
                <p className="m-0 text-label uppercase text-ink-3">
                  {t("addNorm.ai.assumptions")}
                </p>
                <ul className="m-0 grid list-disc gap-1 pl-4 text-ink-2">
                  {request.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid gap-1">
              <p className="m-0 text-label uppercase text-ink-3">
                {t("addNorm.ai.checks")}
              </p>
              <ul className="m-0 grid list-disc gap-1 pl-4 text-ink-2">
                {request.checks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
                <li>{t("addNorm.ai.referencePrices")}</li>
              </ul>
            </div>
          </div>
        </AISuggestion>
      }
      footer={
        request.norm.status === "draft" && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Button asChild variant="link" className="text-meta">
              <Link href={`/catalog/${normId}/edit`}>
                {t("addNorm.ai.edit")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="link"
              className="text-meta text-danger"
              onClick={discard}
            >
              {t("addNorm.ai.discard")}
            </Button>
          </div>
        )
      }
    />
  );
}

function NormPreview({
  estimate,
  normId,
  sectionId,
  onSectionChange,
  onBack,
  onAdded,
  add,
  addLabel,
  addedMessage,
  notes,
  footer,
}: {
  estimate: Estimate;
  normId: Id<"norms">;
  sectionId: Id<"sections"> | undefined;
  onSectionChange: (sectionId: Id<"sections"> | undefined) => void;
  onBack: () => void;
  onAdded: () => void;
  // How the norm goes into the Deviz, when not as a published catalog norm.
  add?: (quantity: number) => Promise<unknown>;
  addLabel?: string;
  addedMessage?: (code: string) => string;
  // What to read before the quantity, and the actions under the form.
  notes?: ReactNode;
  footer?: ReactNode;
}) {
  const t = useScopedI18n("estimate");
  const tKinds = useScopedI18n("resources");
  const tNorms = useScopedI18n("norms");
  const locale = useCurrentLocale();
  const normSource = useNormSource();
  const norm = useQuery(api.catalog.norms.get, { normId });
  const addFromNorm = useMutation(api.estimates.lineItems.addFromNorm);
  const run = useRun();
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!norm) {
      return;
    }
    const amount = parseDecimal(quantity);
    if (amount === undefined || amount < 0) {
      setError(t("addNorm.quantityInvalid"));
      return;
    }
    setError(undefined);
    setSaving(true);
    const result = await run(
      () =>
        add
          ? add(amount)
          : addFromNorm({
              estimateId: estimate._id,
              normId,
              quantity: amount,
              sectionId,
            }),
      addedMessage
        ? addedMessage(norm.code)
        : t("addNorm.added", { code: norm.code }),
    );
    setSaving(false);
    if (result.ok) {
      onAdded();
    }
  };

  const resources = norm
    ? [...norm.resources].sort(
        (a, b) => resourceKinds.indexOf(a.kind) - resourceKinds.indexOf(b.kind),
      )
    : [];
  const notesList = norm
    ? [
        { label: t("addNorm.includes"), text: norm.includes },
        { label: t("addNorm.excludes"), text: norm.excludes },
        { label: t("addNorm.measurement"), text: norm.measurement },
      ].filter((note) => note.text)
    : [];

  return (
    <div className="grid gap-4">
      <Button
        type="button"
        variant="link"
        className="justify-self-start"
        onClick={onBack}
      >
        <ArrowLeft aria-hidden />
        {t("addNorm.back")}
      </Button>
      {norm === undefined ? (
        <p className="m-0 text-meta text-ink-3">{t("addNorm.loading")}</p>
      ) : (
        <>
          {notes}
          <div className="grid gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-code text-ink-2">
                {norm.code}
              </span>
              {norm.source === "manufacturer" && !norm.confirmedAt && (
                <Badge>{tNorms("unconfirmed")}</Badge>
              )}
            </span>
            <h3 className="m-0 text-title-card text-ink">{norm.title}</h3>
            <span className="text-meta text-ink-3">
              {[
                normSource(norm),
                norm.version > 1 ? `v${norm.version}` : undefined,
                norm.edition,
                t("addNorm.unit", { unit: formatUnit(norm.unit, locale) }),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          {notesList.length > 0 && (
            <dl className="m-0 grid gap-2">
              {notesList.map((note) => (
                <div key={note.label} className="grid gap-0.5">
                  <dt className="text-label uppercase text-ink-3">
                    {note.label}
                  </dt>
                  <dd className="m-0 whitespace-pre-line text-body text-ink-2">
                    {note.text}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <div className="grid gap-2 rounded-md border border-border bg-sunken px-4 py-3">
            <p className="m-0 text-label uppercase text-ink-3">
              {t("addNorm.resources", { unit: formatUnit(norm.unit, locale) })}
            </p>
            <ul className="m-0 grid list-none gap-1.5 p-0">
              {resources.map((resource) => (
                <li
                  key={resource._id}
                  className="flex min-w-0 items-baseline justify-between gap-3 text-body"
                >
                  <span className="grid min-w-0">
                    <span className="text-ink">{resource.name}</span>
                    <span className="text-meta text-ink-3">
                      {tKinds(`kinds.${resource.kind}`)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-2">
                    {resource.unit === "%"
                      ? formatPercent(resource.quantity, locale)
                      : `${formatConsumption(resource.quantity, locale)} ${formatUnit(resource.unit, locale)}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <form className="grid gap-4" onSubmit={submit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("addNorm.quantity")}
                htmlFor="add-norm-quantity"
                error={error}
              >
                <DecimalInput
                  id="add-norm-quantity"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  suffix={formatUnit(norm.unit, locale)}
                  aria-invalid={error !== undefined}
                  autoFocus
                />
              </Field>
              {estimate.sections.length > 0 && (
                <Field label={t("addNorm.section")} htmlFor="add-norm-section">
                  <SectionSelect
                    id="add-norm-section"
                    sections={estimate.sections}
                    value={sectionId}
                    onChange={onSectionChange}
                  />
                </Field>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>{footer}</div>
              <Button type="submit" disabled={saving}>
                {saving && (
                  <Icons.Loader className="animate-spin" aria-hidden />
                )}
                {addLabel ?? t("addNorm.add")}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
