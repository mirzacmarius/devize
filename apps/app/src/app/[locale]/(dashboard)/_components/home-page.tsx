"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import { Icons } from "@devize/ui/icons";
import { TickBar } from "@devize/ui/meter";
import { PageHeader } from "@devize/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@devize/ui/table";
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
import { EstimateStatusPill } from "@/components/estimate-status";
import { useFirm } from "@/components/firm-provider";
import {
  estimateCode,
  formatCalendarDate,
  formatCount,
  formatDay,
  formatMoney,
  formatPercent,
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
  const [creating, setCreating] = useState(false);

  const money = (value: number | undefined) =>
    value === undefined ? "—" : formatMoney(value, locale);
  const count = (value: number) => formatCount(value, locale);
  const decided = home?.acceptance.decided ?? 0;
  const rate =
    home && decided > 0
      ? Math.round((home.acceptance.accepted / decided) * 100)
      : undefined;
  const percent = rate === undefined ? "—" : formatPercent(rate, locale);
  // The first steps stay in the rail until the firm has taken all three.
  const showSetup =
    home !== undefined &&
    !(home.setup.firmDetails && home.setup.rates && home.setup.estimates);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", { firm: firm.name })}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            {t("newEstimate")}
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            t("kpi.acceptedMeta", { count: count(home.accepted.allTime) })
          }
        />
        <Kpi
          label={t("kpi.acceptance")}
          value={percent}
          meta={
            home &&
            (decided > 0
              ? t("kpi.acceptanceMeta", {
                  accepted: count(home.acceptance.accepted),
                  decided: count(decided),
                })
              : t("kpi.acceptanceNone"))
          }
        >
          <TickBar
            value={rate ?? 0}
            thin
            label={t("kpi.acceptanceLabel", { percent })}
            className="my-1.5"
          />
        </Kpi>
      </div>
      <div
        className={cn(
          "grid items-start gap-6",
          showSetup && "lg:grid-cols-[minmax(0,1fr)_theme(spacing.rail)]",
        )}
      >
        <div className="grid min-w-0 gap-6">
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
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  meta: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card className="grid content-start gap-1 p-5">
      <p className="m-0 text-meta text-ink-3">{label}</p>
      <p className="m-0 flex flex-wrap items-baseline gap-x-2">
        <span className="text-kpi tabular-nums text-ink">{value}</span>
        {unit && <span className="text-meta text-ink-3">{unit}</span>}
      </p>
      {children}
      <p className="m-0 min-h-5 text-meta text-ink-3">{meta}</p>
    </Card>
  );
}

const todoIcons: Record<Todo["kind"], LucideIcon> = {
  question: MessageCircle,
  alert: TrendingUp,
  deadline: CalendarClock,
  expiring: Hourglass,
  unread: PhoneCall,
};

/** What wants doing, most pressing first; each line opens its Deviz. */
function TodoCard({ todo }: { todo: Overview["todo"] | undefined }) {
  const t = useScopedI18n("home.todo");
  const tc = useScopedI18n("common");
  return (
    <Card>
      <CardHeader className="grid justify-stretch gap-1">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
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
          <ul className="m-0 grid list-none p-0">
            {todo.map((item, index) => (
              <TodoRow
                key={`${item.kind}-${item.estimate._id}`}
                item={item}
                first={index === 0}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TodoRow({ item, first }: { item: Todo; first: boolean }) {
  const t = useScopedI18n("home.todo");
  const locale = useCurrentLocale();
  const code = estimateCode(item.estimate.number, item.estimate.revision);
  const days = "days" in item ? formatCount(item.days, locale) : "";
  const Icon = todoIcons[item.kind];
  const href =
    item.kind === "alert" ? "/prices" : `/estimates/${item.estimate._id}`;

  let text: string;
  switch (item.kind) {
    case "question":
      text =
        item.count === 1
          ? t("questionOne", { code })
          : t("question", { code, count: formatCount(item.count, locale) });
      break;
    case "alert":
      text = t("alert", {
        code,
        percent: `${item.percent > 0 ? "+" : "−"}${formatPercent(Math.abs(item.percent), locale)}`,
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
                date: formatCalendarDate(item.date, locale),
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
    <li className={cn("py-3", first ? "pt-0" : "border-t border-border")}>
      <Link
        href={href}
        className="group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-md bg-tile text-ink-2 [&_svg]:size-4"
        >
          <Icon />
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span className="text-body text-ink group-hover:underline">
            {text}
          </span>
          <span className="truncate text-meta text-ink-3">
            {item.estimate.title}
            {item.estimate.clientName && ` · ${item.estimate.clientName}`}
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
  const te = useScopedI18n("estimates");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/estimates">{t("all")}</Link>
        </Button>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-4">
        {recent?.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-body text-ink-2">{t("empty")}</p>
            <Button variant="outline" onClick={onNewEstimate}>
              <Plus aria-hidden />
              {th("newEstimate")}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{te("columns.estimate")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {te("columns.client")}
                </TableHead>
                <TableHead>{te("columns.status")}</TableHead>
                <TableHead className="text-right">
                  {te("columns.total")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent === undefined && (
                <TableRow>
                  <TableCell colSpan={4} className="text-ink-3">
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              )}
              {recent?.map((row) => (
                <TableRow key={row._id}>
                  <TableCell>
                    <Link
                      href={`/estimates/${row._id}`}
                      className="group grid gap-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="font-mono text-code text-ink-3">
                        {estimateCode(row.number, row.revision)}
                      </span>
                      <span className="text-body font-medium text-ink group-hover:underline">
                        {row.title}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-ink-2 md:table-cell">
                    {row.clientName ?? (
                      <span className="text-ink-3">{t("noClient")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <EstimateStatusPill status={row.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="grid gap-0.5">
                      <span>{formatMoney(row.total, locale)}</span>
                      <span className="text-meta text-ink-3">
                        {formatDay(row.updatedAt, locale)}
                      </span>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
      <TickRule />
      <CardContent className="pt-4">
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
