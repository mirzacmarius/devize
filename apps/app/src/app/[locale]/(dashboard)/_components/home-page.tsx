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
import { StatusPill } from "@devize/ui/status-pill";
import { cn } from "@devize/ui/utils";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  CalendarClock,
  FileClock,
  Hourglass,
  type LucideIcon,
  MessageCircle,
  PhoneCall,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Amount, Lei } from "@/components/amount";
import { EstimateStatusPill } from "@/components/estimate-status";
import { useFirm } from "@/components/firm-provider";
import { FootAction } from "@/components/foot-action";
import {
  estimateCode,
  formatCalendarDay,
  formatCount,
  formatMoney,
  formatPercent,
  formatToday,
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
  const today = formatToday(locale);
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
        description={t("subtitle", {
          date: (
            <>
              <span className="max-sm:hidden">{today.weekday}, </span>
              {today.date}
            </>
          ),
        })}
        actions={
          <FootAction>
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              {t("newEstimate")}
            </Button>
          </FootAction>
        }
      />
      {/* On a phone the next section's hairline closes the figures. */}
      <Card className="grid grid-cols-3 max-sm:-mb-4 max-sm:!border-t-0 sm:-mt-1 sm:grid-cols-2 xl:grid-cols-[calc((100%_-_48px)/3_+_12px)_repeat(3,calc((100%_-_48px)*2/9_+_12px))]">
        <Kpi
          lead
          label={t("kpi.receivable")}
          value={money(receivable?.total)}
          unit={t("lei")}
          meta={
            receivable &&
            (receivable.overdue > 0 ? (
              <StatusPill tone="danger">
                {t("kpi.overdue", {
                  amount: formatMoney(receivable.overdue, locale),
                })}
              </StatusPill>
            ) : (
              t("kpi.noneOverdue")
            ))
          }
        />
        <Kpi
          label={t("kpi.accepted")}
          short={t("kpi.acceptedShort")}
          value={money(home?.accepted.total)}
          unit={t("lei")}
          metaShort={t("kpi.acceptedShortMeta")}
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
          label={t("kpi.sent")}
          short={t("kpi.sentShort")}
          value={money(home?.sent.total)}
          unit={t("lei")}
          metaShort={
            home && t("kpi.sentMetaShort", { count: count(home.sent.unread) })
          }
          meta={home && t("kpi.sentMeta", { count: count(home.sent.unread) })}
        />
        <Kpi
          label={t("kpi.drafts")}
          value={money(home?.drafts.total)}
          unit={t("lei")}
          meta={home && t("kpi.draftsMeta", { count: home.drafts.count })}
        />
      </Card>
      <div
        className={cn(
          "grid items-start gap-6",
          showSetup &&
            "xl:grid-cols-[minmax(0,1fr)_theme(spacing.rail)] xl:gap-x-8",
        )}
      >
        <div
          className={cn(
            "grid min-w-0 gap-6",
            !showSetup &&
              "xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] xl:gap-x-12",
          )}
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

/**
 * One headline figure: what it is, the number, its unit and what it counts. The
 * rows are the strip's, so the sums share a baseline whatever their size; the
 * `lead` is the one the page is about, and on a phone the rest sit under it.
 */
function Kpi({
  lead = false,
  label,
  short,
  value,
  unit,
  meta,
  metaShort,
}: {
  lead?: boolean;
  label: string;
  // Where three stand side by side on a phone.
  short?: string;
  value: string;
  unit?: string;
  meta: ReactNode;
  metaShort?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "row-span-3 grid min-w-0 grid-rows-subgrid gap-y-0.5 border-border sm:px-6 sm:py-1 sm:first:pl-0 sm:max-xl:py-3 sm:max-xl:[&:nth-child(even)]:border-l sm:max-xl:[&:nth-child(n+3)]:border-t sm:max-xl:[&:nth-child(odd)]:pl-0 xl:[&:not(:first-child)]:border-l",
        lead
          ? "max-sm:col-span-3 max-sm:px-4 max-sm:pb-2.5 max-sm:pt-1"
          : "max-sm:border-t max-sm:px-4 max-sm:py-1.5 max-sm:[&:nth-child(n+3)]:border-l",
      )}
    >
      <p className="m-0 truncate text-meta text-ink-2">
        {short ? (
          <>
            <span className="sm:hidden">{short}</span>
            <span className="max-sm:hidden">{label}</span>
          </>
        ) : (
          label
        )}
      </p>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 self-baseline">
        <span
          className={cn(
            "tabular-nums tracking-[-0.01em] [font-weight:var(--weight-figure)]",
            lead
              ? "text-lead text-ink sm:text-hero"
              : "text-base leading-6 text-ink sm:text-figure",
          )}
        >
          {/* One figure leads; the others are one tone. */}
          {lead ? <Amount value={value} /> : value}
        </span>
        {unit && (
          <span
            className={cn("text-meta text-ink-3", !lead && "max-sm:hidden")}
          >
            {unit}
          </span>
        )}
      </div>
      <p className="m-0 min-h-[18px] truncate text-meta text-ink-3">
        {metaShort ? (
          <>
            <span className="sm:hidden">{metaShort}</span>
            <span className="max-sm:hidden">{meta}</span>
          </>
        ) : (
          meta
        )}
      </p>
    </div>
  );
}

const todoIcons: Record<Exclude<Todo["kind"], "alert">, LucideIcon> = {
  question: MessageCircle,
  deadline: CalendarClock,
  expiring: Hourglass,
  unread: PhoneCall,
};

// What can't wait: someone asked, money moved, or a date is on top of us.
const isNow = (item: Todo) =>
  item.kind === "question" ||
  item.kind === "alert" ||
  ((item.kind === "deadline" || item.kind === "expiring") && item.days <= 2);

// On a phone the list stops here, so the recent devize aren't far below.
const PHONE_TODO = 4;

/** What wants doing, most pressing first; each line opens its Deviz. */
function TodoCard({ todo }: { todo: Overview["todo"] | undefined }) {
  const t = useScopedI18n("home.todo");
  const tc = useScopedI18n("common");
  const { firm } = useFirm();
  // A deadline with ANAF passed comes before anything a client is waiting for.
  const anaf = useQuery(api.invoices.invoices.efacturaDue, {
    organizationId: firm._id,
    today: todayInput(),
  });
  const late = anaf !== undefined && anaf.late > 0 ? anaf : undefined;
  const [showAll, setShowAll] = useState(false);
  const now = todo?.filter(isNow) ?? [];
  const next = todo?.filter((item) => !isNow(item)) ?? [];
  const hidden = showAll
    ? []
    : [...now, ...next].slice(late ? PHONE_TODO - 1 : PHONE_TODO);
  const group = (title: string, items: Todo[], first?: ReactNode) =>
    (items.length > 0 || first) && (
      <section
        className={cn(
          "grid",
          !first &&
            items.every((item) => hidden.includes(item)) &&
            "max-sm:hidden",
        )}
      >
        <h4 className="m-0 pb-1.5 text-head text-ink-3">{title}</h4>
        <ul className="m-0 grid list-none p-0">
          {first}
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
        {hidden.length > 0 && todo !== undefined && (
          <Button
            type="button"
            variant="link"
            className="sm:hidden"
            onClick={() => setShowAll(true)}
          >
            {t("showAll", { count: todo.length + (late ? 1 : 0) })}
          </Button>
        )}
      </CardHeader>
      <CardContent className="gap-5 pb-2">
        {todo === undefined ? (
          <p className="m-0 text-body text-ink-3">{tc("loading")}</p>
        ) : todo.length === 0 && !late ? (
          <p className="m-0 flex items-start gap-2 text-body text-ink-2">
            <Icons.Check
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-success-dot"
            />
            {t("empty")}
          </p>
        ) : (
          <>
            {group(
              t("now"),
              now,
              late && (
                <TodoLine
                  href={
                    late.firstLate ? `/invoices/${late.firstLate}` : "/invoices"
                  }
                  icon={FileClock}
                  tone="danger"
                  text={t("anaf")}
                  sub={t("anafSub")}
                  figure={t("anafCount", { count: late.late })}
                  figureClass="font-medium text-danger"
                />
              ),
            )}
            {group(t("next"), next)}
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
  const icon =
    item.kind === "alert"
      ? item.profitChange < 0
        ? TrendingDown
        : TrendingUp
      : todoIcons[item.kind];
  const href =
    item.kind === "alert" ? "/prices" : `/estimates/${item.estimate._id}`;
  const inDays = (days: number) =>
    days <= 0
      ? t("today")
      : days === 1
        ? t("tomorrow")
        : t("inDays", { days: formatCount(days, locale) });

  // What to do, on the left; how much or how soon, in the column on the right.
  let text: string;
  let figure: ReactNode;
  let figureClass = "text-ink-2";
  // The icon's colour says what the figure's says, and only then.
  let tone: keyof typeof todoTones = "quiet";
  let note: string | undefined;
  switch (item.kind) {
    case "question":
      text = t("question", { code });
      figure = t("questionCount", { count: item.count });
      break;
    case "alert":
      if (item.profitChange === 0) {
        text = t("alert", { code });
      } else {
        const down = item.profitChange < 0;
        // The words say which way it went.
        text = t(down ? "alertDown" : "alertUp", { code });
        figure = (
          <Lei
            value={`${down ? "−" : "+"}${formatMoney(Math.abs(item.profitChange), locale)}`}
          />
        );
        figureClass = cn("font-medium", down ? "text-warning" : "text-success");
        tone = down ? "warning" : "quiet";
        note = t("alertLeft", { left: formatMoney(item.profitLeft, locale) });
      }
      break;
    case "deadline":
      text = t("deadline", { code });
      figure = inDays(item.days);
      note = formatCalendarDay(item.date, locale);
      break;
    case "expiring":
      text = t("expiring", { code });
      figure = inDays(Math.max(item.days, 1));
      break;
    case "unread":
      text = t("unread", { code });
      figure = t("unreadDays", { days: formatCount(item.days, locale) });
      break;
  }
  if ((item.kind === "deadline" || item.kind === "expiring") && isNow(item)) {
    figureClass = "font-medium text-warning";
    tone = "warning";
  }

  return (
    <TodoLine
      href={href}
      icon={icon}
      tone={tone}
      text={text}
      sub={item.estimate.title}
      note={note}
      figure={figure}
      figureClass={figureClass}
      phoneHidden={phoneHidden}
    />
  );
}

const todoTones = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  // Every line has its tile; only what can't wait has a colour.
  quiet: "bg-sunken text-ink-3",
};

/**
 * One line of the list: what to do and, in the column at its end, how much or
 * how soon; under them the Deviz it's about, whole, even on a phone, and what
 * else there is to know, on a line of its own there.
 */
function TodoLine({
  href,
  icon: Icon,
  tone,
  text,
  sub,
  note,
  figure,
  figureClass,
  phoneHidden = false,
}: {
  href: string;
  icon: LucideIcon;
  tone: keyof typeof todoTones;
  text: string;
  sub: string;
  note?: string;
  figure?: ReactNode;
  figureClass: string;
  phoneHidden?: boolean;
}) {
  return (
    <li
      className={cn(
        "border-t border-border first:border-t-rule",
        phoneHidden && "max-sm:hidden",
      )}
    >
      <Link
        href={href}
        className="group -mx-2 grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] content-center items-baseline gap-x-3 gap-y-0.5 rounded-md px-2 py-2 transition-colors hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden
          className={cn(
            "row-span-2 grid size-7 place-items-center self-center rounded-md [&_svg]:size-4",
            todoTones[tone],
          )}
        >
          <Icon />
        </span>
        <span
          className={cn(
            "col-start-2 min-w-0 text-body font-medium text-ink max-sm:text-body-lg",
            !figure && "col-span-2",
          )}
        >
          {text}
        </span>
        {figure && (
          <span
            className={cn(
              "col-start-3 row-start-1 whitespace-nowrap text-right text-body tabular-nums",
              figureClass,
            )}
          >
            {figure}
          </span>
        )}
        <span className="col-span-2 col-start-2 text-meta text-ink-3 sm:line-clamp-2">
          {sub}
          {note && (
            <span className="max-sm:block">
              <span className="max-sm:hidden"> · </span>
              {note}
            </span>
          )}
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
          // Under heads on the to-do list's label's line, so the two lists' lines match.
          <section className="grid">
            <div className="flex justify-between gap-4 pb-1.5 text-head text-ink-3 max-sm:hidden">
              <h4 className="m-0 [font:inherit]">{t("columnEstimate")}</h4>
              <span>{t("columnTotal")}</span>
            </div>
            <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] p-0 sm:grid-cols-[minmax(0,1fr)_auto]">
              {recent === undefined && (
                <li className="py-2 text-body text-ink-3 sm:col-span-2">
                  {tc("loading")}
                </li>
              )}
              {recent?.map((row) => (
                <li
                  key={row._id}
                  // A phone has no heads for a first rule to close.
                  className="border-t border-border first:border-t-rule max-sm:first:border-t-0 sm:col-span-2 sm:grid sm:grid-cols-subgrid"
                >
                  {/* One column at the end for all the rows: sums and statuses on
                      its right edge. */}
                  <Link
                    href={`/estimates/${row._id}`}
                    className="-mx-2 grid min-h-14 content-center gap-y-0.5 rounded-md px-2 py-2 transition-colors hover:bg-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-span-2 sm:grid-cols-subgrid sm:gap-x-4"
                  >
                    <span className="min-w-0 text-body font-medium text-ink max-sm:text-body-lg sm:truncate">
                      {row.title}
                    </span>
                    <span className="whitespace-nowrap text-right text-body font-medium tabular-nums text-ink max-sm:hidden">
                      {formatMoney(row.total, locale)}
                    </span>
                    <span className="min-w-0 truncate text-meta text-ink-3">
                      {estimateCode(row.number, row.revision)}
                      {" · "}
                      {row.clientName ?? t("noClient")}
                    </span>
                    <span className="flex h-[18px] items-center justify-end max-sm:hidden">
                      <EstimateStatusPill short status={row.status} />
                    </span>
                    {/* On a phone, its own line: where it stands and how much. */}
                    <span className="flex items-baseline justify-between gap-4 sm:hidden">
                      <EstimateStatusPill short status={row.status} />
                      <span className="whitespace-nowrap text-body font-medium tabular-nums text-ink">
                        {formatMoney(row.total, locale)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
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
