"use client";

import {
  type CheckedLine,
  type FormCheck,
  type FormCheckState,
  leiInFiguresAndWords,
  leiInWords,
  type OfferValue,
} from "@devize/forms/sheet";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { toast } from "@devize/ui/sonner";
import { cn } from "@devize/ui/utils";
import { Check, CircleAlert, TriangleAlert } from "lucide-react";
import { useState } from "react";
import {
  formatCalendarDate,
  formatMoney,
  formatPercent,
  formatQuantity,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

/** What a check's link does: take the person to the field, or keep what is there. */
export type CheckAction = "change" | "keep";

const ringClass: Record<FormCheckState, string> = {
  passed: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  failed: "bg-danger-soft text-danger",
};

// How many lines or positions to name before "și încă 3".
const NAMED = 3;
// A line's title, cut where a list of them stays readable.
const TITLE_LENGTH = 40;

function shortTitle(title: string): string {
  const text = title.replace(/\s+/g, " ").trim();
  if (text.length <= TITLE_LENGTH) {
    return text;
  }
  const cut = text.slice(0, TITLE_LENGTH);
  const space = cut.lastIndexOf(" ");
  return `${(space > TITLE_LENGTH / 2 ? cut.slice(0, space) : cut).trim()}…`;
}

/**
 * The checks of the forms chosen, before they are downloaded: the offer's
 * value in figures and in words, then what to look at, and what passed
 * folded away.
 */
export function FormChecks({
  checks,
  value,
  onFix,
}: {
  checks: readonly FormCheck[];
  // Left out for lists without prices.
  value?: OfferValue;
  onFix: (check: FormCheck, action: CheckAction) => void;
}) {
  const t = useScopedI18n("documents.forms.checks");
  const [showPassed, setShowPassed] = useState(false);
  const problems = checks.filter((check) => check.state !== "passed");
  const passed = checks.filter((check) => check.state === "passed");
  return (
    <section
      aria-labelledby="forms-checks"
      className="grid min-w-0 gap-3 rounded-md border border-border bg-card px-4 py-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="forms-checks" className="m-0 text-body font-medium text-ink">
          {t("title")}
        </h3>
        <span className="shrink-0 text-meta text-ink-3">
          {t("score", { passed: passed.length, total: checks.length })}
        </span>
      </div>
      {value && <OfferValueBox value={value} />}
      {problems.length > 0 ? (
        <ul className="m-0 grid list-none gap-3 p-0">
          {problems.map((check) => (
            <CheckRow key={check.id} check={check} onFix={onFix} />
          ))}
        </ul>
      ) : (
        <p className="m-0 text-meta text-ink-3">{t("allPassed")}</p>
      )}
      {passed.length > 0 && (
        <>
          <Button
            type="button"
            variant="link"
            className="justify-self-start text-meta"
            aria-expanded={showPassed}
            onClick={() => setShowPassed(!showPassed)}
          >
            {showPassed
              ? t("hidePassed")
              : t("showPassed", { count: passed.length })}
          </Button>
          {showPassed && (
            <ul className="m-0 grid list-none gap-3 p-0">
              {passed.map((check) => (
                <CheckRow key={check.id} check={check} onFix={onFix} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** The value to write in the offer form, without VAT, the VAT and the total, each ready to copy. */
function OfferValueBox({ value }: { value: OfferValue }) {
  const t = useScopedI18n("documents.forms.checks.value");
  const locale = useCurrentLocale();
  const money = (amount: number) => formatMoney(amount, locale);

  // The offer form is Romanian, whatever the page's language.
  const copy = async (amount: number) => {
    const text = leiInFiguresAndWords(amount);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(text);
    }
  };

  const amount = (label: string, lei: number, copyLabel: string) => (
    <div className="flex items-start justify-between gap-3">
      <div className="grid min-w-0 gap-0.5">
        <span className="text-meta text-ink-3">{label}</span>
        <span className="text-body font-semibold tabular-nums text-ink">
          {t("lei", { amount: money(lei) })}
        </span>
        <span lang="ro" className="text-meta text-ink-2">
          {leiInWords(lei)}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="-mr-2 -mt-1 shrink-0"
        aria-label={copyLabel}
        title={copyLabel}
        onClick={() => copy(lei)}
      >
        <Icons.Copy aria-hidden />
      </Button>
    </div>
  );

  return (
    <div className="grid gap-3 rounded-md bg-muted px-3 py-3">
      <span className="text-meta font-medium text-ink">{t("title")}</span>
      {amount(t("subtotal"), value.subtotal, t("copySubtotal"))}
      {value.rate > 0 && (
        <>
          {amount(
            t("vat", { rate: formatPercent(value.rate, locale) }),
            value.vat,
            t("copyVat"),
          )}
          {amount(t("total"), value.total, t("copyTotal"))}
        </>
      )}
      <p className="m-0 text-meta text-ink-3">
        {t("hint")}
        {value.difference !== 0 &&
          ` ${t("difference", { difference: money(Math.abs(value.difference)) })}`}
      </p>
    </div>
  );
}

function CheckRow({
  check,
  onFix,
}: {
  check: FormCheck;
  onFix: (check: FormCheck, action: CheckAction) => void;
}) {
  const t = useScopedI18n("documents.forms.checks");
  const { title, detail } = useCheckText()(check);
  const fixes = useFixes()(check);
  return (
    <li className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-3">
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full",
          ringClass[check.state],
        )}
      >
        {check.state === "passed" && <Check className="size-3.5" aria-hidden />}
        {check.state === "warning" && (
          <CircleAlert className="size-3.5" aria-hidden />
        )}
        {check.state === "failed" && (
          <TriangleAlert className="size-3.5" aria-hidden />
        )}
      </span>
      <div className="grid min-w-0 justify-items-start">
        <span className="text-body font-medium text-ink">
          <span className="sr-only">{t(`states.${check.state}`)}: </span>
          {title}
        </span>
        <span
          className={cn(
            "break-words text-meta",
            check.state === "warning" ? "text-warning" : "text-ink-3",
          )}
        >
          {detail}
        </span>
        {fixes.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {fixes.map((fix) => (
              <Button
                key={fix.action}
                type="button"
                variant="link"
                className="text-meta"
                onClick={() => onFix(check, fix.action)}
              >
                {fix.label}
              </Button>
            ))}
          </span>
        )}
      </div>
    </li>
  );
}

/** What a check found, as a short title and the lines or numbers under it. */
function useCheckText() {
  const t = useScopedI18n("documents.forms.checks");
  const locale = useCurrentLocale();
  const named = (names: readonly string[]) =>
    names.length > NAMED
      ? t("more", {
          names: names.slice(0, NAMED).join(", "),
          count: names.length - NAMED,
        })
      : names.join(", ");
  const lines = (list: readonly CheckedLine[]) =>
    named(
      list.map((line) =>
        t("line", { number: line.number, title: shortTitle(line.title) }),
      ),
    );

  return (check: FormCheck): { title: string; detail: string } => {
    switch (check.id) {
      case "unpriced":
        return check.state === "passed"
          ? { title: t("unpriced.title"), detail: t("unpriced.passed") }
          : {
              title: t("unpriced.failedTitle"),
              detail: t("unpriced.failed", { names: lines(check.lines) }),
            };
      case "repeated":
        return check.state === "passed"
          ? { title: t("repeated.title"), detail: t("repeated.passed") }
          : {
              title: t("repeated.failedTitle"),
              detail: t("repeated.failed", {
                names: named(
                  check.positions.map((position) =>
                    t("repeated.position", position),
                  ),
                ),
              }),
            };
      case "missing":
        return check.state === "passed"
          ? { title: t("missing.title"), detail: t("missing.passed") }
          : {
              title: t("missing.warningTitle"),
              detail: t("missing.warning", {
                names: named(
                  check.positions.map((position) =>
                    t("missing.position", position),
                  ),
                ),
              }),
            };
      case "added":
        return check.state === "passed"
          ? { title: t("added.title"), detail: t("added.passed") }
          : {
              title: t("added.warningTitle"),
              detail: t("added.warning", { names: lines(check.lines) }),
            };
      case "quantities":
        return check.state === "passed"
          ? { title: t("quantities.title"), detail: t("quantities.passed") }
          : {
              title: t("quantities.warningTitle"),
              detail: t("quantities.warning", {
                names: named(
                  check.lines.map((line) =>
                    t("quantities.line", {
                      number: line.number,
                      quantity: formatQuantity(line.quantity, locale),
                      tendered: formatQuantity(line.tendered, locale),
                      unit: line.unit,
                    }),
                  ),
                ),
              }),
            };
      case "placement":
        return check.state === "passed"
          ? { title: t("placement.title"), detail: t("placement.passed") }
          : {
              title: t("placement.warningTitle"),
              detail: t("placement.warning", {
                names: named(check.categories.map((category) => category.name)),
              }),
            };
      case "procurement":
        if (check.state === "warning") {
          return {
            title: t("procurement.warningTitle"),
            detail: t("procurement.warning", { count: check.count }),
          };
        }
        return {
          title: t("procurement.title"),
          detail:
            check.count > 0
              ? t("procurement.passed", { count: check.count })
              : t("procurement.passedNone"),
        };
      case "duration":
        if (check.state === "passed") {
          return {
            title: t("duration.title"),
            detail: t("duration.passed", { months: check.months }),
          };
        }
        return {
          title: t("duration.warningTitle"),
          detail:
            check.hours > 0
              ? t("duration.warning")
              : t("duration.warningNoHours"),
        };
      case "validity":
        if (check.until) {
          return {
            title: t("validity.title"),
            detail: t("validity.passed", {
              days: check.days ?? 0,
              date: formatCalendarDate(check.until, locale),
            }),
          };
        }
        return check.days === undefined
          ? {
              title: t("validity.warningTitle"),
              detail: t("validity.warning"),
            }
          : {
              title: t("validity.noDeadlineTitle"),
              detail: t("validity.noDeadline", { days: check.days }),
            };
      case "signer":
        return check.state === "passed"
          ? {
              title: t("signer.title"),
              detail: t("signer.passed", {
                name: check.name,
                role: check.role,
              }),
            }
          : { title: t("signer.warningTitle"), detail: t("signer.warning") };
      case "beneficiary":
        return check.state === "passed"
          ? { title: t("beneficiary.title"), detail: check.name }
          : {
              title: t("beneficiary.warningTitle"),
              detail: t("beneficiary.warning"),
            };
    }
  };
}

/** The links under a check that didn't pass, where the sheet can fix it. */
function useFixes() {
  const t = useScopedI18n("documents.forms.checks");
  return (check: FormCheck): { label: string; action: CheckAction }[] => {
    if (check.state === "passed") {
      return [];
    }
    switch (check.id) {
      case "placement":
        return [
          { label: t("placement.fix"), action: "change" },
          { label: t("placement.keep"), action: "keep" },
        ];
      case "procurement":
        return [{ label: t("procurement.fix"), action: "change" }];
      case "duration":
        return [
          { label: t("duration.fix"), action: "change" },
          { label: t("duration.keep"), action: "keep" },
        ];
      case "validity":
        // Without the tender's deadline, the date is the Deviz's to give.
        return check.days === undefined
          ? [{ label: t("validity.fix"), action: "change" }]
          : [];
      case "signer":
        return [{ label: t("signer.fix"), action: "change" }];
      case "beneficiary":
        return [{ label: t("beneficiary.fix"), action: "change" }];
      default:
        return [];
    }
  };
}
