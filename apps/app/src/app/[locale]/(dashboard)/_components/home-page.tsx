"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { PageHeader } from "@devize/ui/page-header";
import { cn } from "@devize/ui/utils";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  CalendarClock,
  Hourglass,
  type LucideIcon,
  MessageCircle,
  PhoneCall,
  Plus,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Amount } from "@/components/amount";
import { EstimateStatusPill } from "@/components/estimate-status";
import { useFirm } from "@/components/firm-provider";
import {
  estimateCode,
  formatCalendarDay,
  formatCount,
  formatDay,
  formatMoney,
  formatPercent,
  todayInput,
} from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { NewEstimateDialog } from "../estimates/_components/new-estimate-dialog";

type Overview = FunctionReturnType<typeof api.home.overview>;
type Todo = Overview["todo"][number];

/**
 * Acasă: the firm's figures, what wants doing today and the recent devize,
 * with the first steps while the firm is new.
 */
export function HomePage() {
  const t = useScopedI18n("home");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const home = useQuery(api.home.overview, { organizationId: firm._id });
  const receivable = useQuery(api.invoices.invoices.receivable, {
    organizationId: firm._id,
    today: todayInput(),
  });
  const [creating, setCreating] = useState(false);

  const money = (value: number | undefined) =>
    value === undefined ? "–" : formatMoney(value, locale);
  const count = (value: number) => formatCount(value, locale);
  const decided = home?.acceptance.decided ?? 0;
  const rate =
    home && decided > 0
      ? Math.round((home.acceptance.accepted / decided) * 100)
      : undefined;
  // The first steps stay in the rail until the firm has taken all three.
  const showSetup =
    home !== undefined &&
    !(home.setup.firmDetails && home.setup.rates && home.setup.estimates);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("allWithVat")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            {t("newEstimate")}
          </Button>
        }
      />
      {/* On a phone the next section's hairline closes the figures. */}
      <Card className="grid grid-cols-2 max-sm:-mb-6 xl:grid-cols-4">
        <Kpi
          label={t("kpi.drafts")}
          value={money(home?.drafts.total)}
          unit={t("lei")}
          meta={
            home && t("kpi.draftsMeta", { count: count(home.drafts.count) })
          }
        />
        <Kpi
          label={t("kpi.sent")}
          value={money(home?.sent.total)}
          unit={t("lei")}
          meta={home && t("kpi.sentMeta", { count: count(home.sent.unread) })}
        />
        <Kpi
          label={t("kpi.accepted")}
          value={money(home?.accepted.total)}
          unit={t("lei")}
          meta={
            home &&
            (rate === undefined
              ? t("kpi.acceptedMeta", { count: count(home.accepted.allTime) })
              : t("kpi.acceptanceRate", {
                  percent: formatPercent(rate, locale),
                }))
          }
        />
        <Kpi
          label={t("kpi.receivable")}
          value={money(receivable?.total)}
          unit={t("lei")}
          meta={
            receivable &&
            (receivable.overdue > 0
              ? t("kpi.overdue", {
                  amount: formatMoney(receivable.overdue, locale),
                })
              : t("kpi.noneOverdue"))
          }
        />
      </Card>
      <div
        className={cn(
          "grid items-start gap-6",
          showSetup && "lg:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]",
        )}
      >
        <div
          className={cn("grid min-w-0 gap-6", !showSetup && "xl:grid-cols-2")}
        >
          <TodoCard todo={home?.todo} />
          <RecentCard
            recent={home?.recent}
            onNewEstimate={() => setCreating(true)}
          />
        </div>
        {showSetup && (
          <SetupCard
            setup={home.setup}
            onNewEstimate={() => setCreating(true)}
          />
        )}
      </div>
      <NewEstimateDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}

/** One headline figure: what it is, the number, its unit and what it counts. */
function Kpi({
  label,
  value,
  unit,
  meta,
}: {
  label: string;
  value: string;
  unit?: string;
  meta: ReactNode;
}) {
  return (
    <div className="grid min-w-0 content-start gap-0.5 border-border px-4 py-2.5 max-xl:[&:nth-child(even)]:border-l max-xl:[&:nth-child(n+3)]:border-t sm:gap-1 sm:p-5 xl:[&:not(:first-child)]:border-l">
      <p className="m-0 truncate text-meta text-ink-2">{label}</p>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
        <span className="text-[22px] leading-8 tracking-[-0.01em] tabular-nums text-ink [font-weight:var(--weight-figure)] sm:text-kpi">
          <Amount value={value} />
        </span>
        {unit && <span className="text-meta text-ink-3">{unit}</span>}
      </div>
      <p className="m-0 min-h-[18px] truncate text-meta text-ink-3">{meta}</p>
    </div>
  );
}

const todoIcons: Record<Todo["kind"], LucideIcon> = {
  question: MessageCircle,
  alert: TrendingUp,
  deadline: CalendarClock,
  expiring: Hourglass,
  unread: PhoneCall,
};

// What can't wait: someone asked, or money moved. The rest has a date.
const isNow = (item: Todo) => item.kind === "question" || item.kind === "alert";

// On a phone the list stops here, so the recent devize aren't far below.
const PHONE_TODO = 4;

/** What wants doing, most pressing first; each line opens its Deviz. */
function TodoCard({ todo }: { todo: Overview["todo"] | undefined }) {
  const t = useScopedI18n("home.todo");
  const tc = useScopedI18n("common");
  const [showAll, setShowAll] = useState(false);
  const now = todo?.filter(isNow) ?? [];
  const next = todo?.filter((item) => !isNow(item)) ?? [];
  const hidden = showAll ? [] : [...now, ...next].slice(PHONE_TODO);
  const group = (title: string, items: Todo[]) =>
    items.length > 0 && (
      <section className="grid">
        <h4 className="m-0 pb-1 text-caption text-ink-3">{title}</h4>
        <ul className="m-0 grid list-none p-0">
          {items.map((item) => (
            <TodoRow
              key={`${item.kind}-${item.estimate._id}`}
              item={item}
              phoneHidden={hidden.includes(item)}
            />
          ))}
        </ul>
      </section>
    );
  return (
    // On a phone the next section's hairline closes the list.
    <Card className="max-sm:-mb-3">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="gap-5 pb-2">
        {todo === undefined ? (
          <p className="m-0 text-body text-ink-3">{tc("loading")}</p>
        ) : todo.length === 0 ? (
          <p className="m-0 flex items-start gap-2 text-body text-ink-2">
            <Icons.Check
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-success-dot"
            />
            {t("empty")}
          </p>
        ) : (
          <>
            {group(t("now"), now)}
            {group(t("next"), next)}
            {hidden.length > 0 && (
              <Button
                type="button"
                variant="link"
                className="justify-self-start pb-3 sm:hidden"
                onClick={() => setShowAll(true)}
              >
                {t("showAll", { count: todo.length })}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TodoRow({ item, phoneHidden }: { item: Todo; phoneHidden: boolean }) {
  const t = useScopedI18n("home.todo");
  const locale = useCurrentLocale();
  const code = estimateCode(item.estimate.number, item.estimate.revision);
  const days = "days" in item ? formatCount(item.days, locale) : "";
  const Icon = todoIcons[item.kind];
  const href =
    item.kind === "alert" ? "/prices" : `/estimates/${item.estimate._id}`;
  // Colour only where time or money is running out: a price change, or a
  // deadline within the week.
  const urgent =
    item.kind === "alert" ||
    ((item.kind === "deadline" || item.kind === "expiring") && item.days <= 7);

  let text: string;
  switch (item.kind) {
    case "question":
      text =
        item.count === 1
          ? t("questionOne", { code })
          : t("question", { code, count: formatCount(item.count, locale) });
      break;
    case "alert":
      text =
        item.profitChange === 0
          ? t("alert", { code })
          : t(item.profitChange < 0 ? "alertDown" : "alertUp", {
              code,
              amount: formatMoney(Math.abs(item.profitChange), locale),
            });
      break;
    case "deadline":
      text =
        item.days === 0
          ? t("deadlineToday", { code })
          : item.days === 1
            ? t("deadlineOne", { code })
            : t("deadline", {
                code,
                days,
                date: formatCalendarDay(item.date, locale),
              });
      break;
    case "expiring":
      text =
        item.days <= 1
          ? t("expiringOne", { code })
          : t("expiring", { code, days });
      break;
    case "unread":
      text = t("unread", { code, days });
      break;
  }

  return (
    <li
      className={cn("border-t border-border", phoneHidden && "max-sm:hidden")}
    >
      <Link
        href={href}
        className="group -mx-2 grid min-h-[59px] grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden
          className={cn(
            "grid size-7 place-items-center rounded-md [&_svg]:size-4",
            urgent ? "bg-warning-soft text-warning" : "bg-muted text-ink-2",
          )}
        >
          <Icon />
        </span>
        <span className="grid min-w-0">
          <span className="text-body text-ink">{text}</span>
          <span className="text-meta text-ink-3 max-sm:line-clamp-2 sm:truncate">
            {item.kind === "alert" &&
              `${t("alertLeft", {
                left: formatMoney(item.profitLeft, locale),
              })} · `}
            {item.estimate.title}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** The devize touched last, with a way to all of them. */
function RecentCard({
  recent,
  onNewEstimate,
}: {
  recent: Overview["recent"] | undefined;
  onNewEstimate: () => void;
}) {
  const t = useScopedI18n("home.recent");
  const th = useScopedI18n("home");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <Button variant="link" asChild>
          <Link href="/estimates">{t("all")}</Link>
        </Button>
      </CardHeader>
      <CardContent className="pb-2">
        {recent?.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-body text-ink-2">{t("empty")}</p>
            <Button variant="outline" onClick={onNewEstimate}>
              <Plus aria-hidden />
              {th("newEstimate")}
            </Button>
          </div>
        ) : (
          <ul className="m-0 grid list-none p-0">
            {recent === undefined && (
              <li className="py-2 text-body text-ink-3">{tc("loading")}</li>
            )}
            {recent?.map((row, index) => (
              <li
                key={row._id}
                className={cn(index > 0 && "border-t border-border")}
              >
                <Link
                  href={`/estimates/${row._id}`}
                  className="-mx-2 grid min-h-[59px] grid-cols-[minmax(0,1fr)_auto] content-center items-center gap-x-4 gap-y-0.5 rounded-md px-2 py-1.5 transition-colors hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="truncate text-body font-medium text-ink">
                    {row.title}
                  </span>
                  <span className="text-right text-body font-medium tabular-nums text-ink">
                    {formatMoney(row.total, locale)}
                  </span>
                  <span className="truncate text-meta text-ink-3">
                    {estimateCode(row.number, row.revision)}
                    {" · "}
                    {row.clientName ?? t("noClient")}
                    {" · "}
                    {formatDay(row.updatedAt, locale)}
                  </span>
                  <span className="flex justify-end">
                    <EstimateStatusPill status={row.status} plain />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** The three steps a new firm has in front of it, each with its way there. */
function SetupCard({
  setup,
  onNewEstimate,
}: {
  setup: Overview["setup"];
  onNewEstimate: () => void;
}) {
  const t = useScopedI18n("home.setup");
  const steps = [
    {
      key: "firm",
      done: setup.firmDetails,
      action: (
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings">{t("firmAction")}</Link>
        </Button>
      ),
    },
    {
      key: "rates",
      done: setup.rates,
      action: (
        <Button variant="outline" size="sm" asChild>
          <Link href="/rates">{t("ratesAction")}</Link>
        </Button>
      ),
    },
    {
      key: "estimate",
      done: setup.estimates,
      action: (
        <Button variant="outline" size="sm" onClick={onNewEstimate}>
          {t("estimateAction")}
        </Button>
      ),
    },
  ] as const;

  return (
    <Card>
      <CardHeader className="grid justify-stretch gap-1">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="m-0 grid list-none gap-4 p-0">
          {steps.map((step, index) => (
            <li
              key={step.key}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-3"
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-6 place-items-center rounded-full text-pill tabular-nums",
                  step.done
                    ? "bg-success-dot/15 text-success-dot [&_svg]:size-3.5"
                    : "bg-tile text-ink-2",
                )}
              >
                {step.done ? <Icons.Check /> : index + 1}
              </span>
              <div className="grid justify-items-start gap-2">
                <p
                  className={cn(
                    "m-0 text-body",
                    step.done ? "text-ink-3" : "text-ink",
                  )}
                >
                  {t(step.key)}
                  {step.done && <span className="sr-only"> {t("done")}</span>}
                </p>
                {!step.done && step.action}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
