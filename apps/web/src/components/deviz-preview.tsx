import { Badge, Count } from "@devize/ui/badge";
import { buttonVariants } from "@devize/ui/button";
import { TickRule } from "@devize/ui/card";
import { Logo } from "@devize/ui/logo";
import { TickBar } from "@devize/ui/meter";
import { StatusPill } from "@devize/ui/status-pill";
import { cn } from "@devize/ui/utils";
import { Check, Sparkles, TriangleAlert } from "lucide-react";

const rows = [
  {
    code: "DV-DEM-02",
    name: "Desfacere faianță și gresie, cu adeziv",
    unit: "mp",
    quantity: "31,40",
    price: "28,50",
    value: "894,90",
  },
  {
    code: "DV-HID-01",
    name: "Hidroizolație elastică, două straturi",
    unit: "mp",
    quantity: "6,20",
    price: "64,00",
    value: "396,80",
    tag: "Normă producător",
  },
  {
    code: "DV-PLC-04",
    name: "Placare gresie 60×60, în diagonală",
    unit: "mp",
    quantity: "6,20",
    price: "212,90",
    value: "1.319,98",
    tag: "Preț citit azi",
  },
  {
    code: "DV-PLC-01",
    name: "Placare faianță 30×60",
    unit: "mp",
    quantity: "24,80",
    price: "178,40",
    value: "4.424,32",
  },
  {
    code: "DV-INS-07",
    name: "Montaj obiecte sanitare",
    unit: "buc",
    quantity: "4,00",
    price: "260,00",
    value: "1.040,00",
  },
];

const checks = [
  { name: "Toate resursele au preț", detail: "38 din 38", ok: true },
  { name: "Prețuri la zi", detail: "citite azi, 4 magazine", ok: true },
  { name: "Fără lucrări uitate", detail: "1 omisiune de văzut", ok: false },
  { name: "TVA corect", detail: "21%", ok: true },
];

const kpis = [
  { label: "Total cu TVA", value: "39.916,16 lei" },
  { label: "Materiale", value: "21.480,30 lei" },
  { label: "Manoperă", value: "11.904,00 lei" },
];

/**
 * A Deviz's page, drawn with the design system's own parts: the hero's proof
 * that the product looks like this. Static, and one picture for assistive
 * technology.
 */
export function DevizPreview({ className }: { className?: string }) {
  return (
    <figure
      role="img"
      aria-label="Devizul DVZ-0142, renovare baie, în aplicație: totalul cu TVA, articolele cu prețurile citite azi, verificările și propunerea Devize AI."
      className={cn(
        "m-0 overflow-hidden rounded-lg border border-border bg-panel text-left shadow-panel",
        className,
      )}
    >
      <div className="flex h-11 items-center justify-between gap-4 border-b border-border px-4">
        <div className="flex items-center gap-3 whitespace-nowrap text-meta text-ink-3">
          <Logo aria-hidden className="size-5" />
          <span className="hidden sm:inline">Devize</span>
          <span aria-hidden className="hidden sm:inline">
            /
          </span>
          <span className="font-mono text-code text-ink">DVZ-0142</span>
        </div>
        <span
          className={cn(buttonVariants({ size: "sm" }), "pointer-events-none")}
        >
          Trimite clientului
        </span>
      </div>

      <div className="flex flex-col gap-5 p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="m-0 text-[26px] font-light leading-[32px] tracking-[-0.015em] text-ink md:text-title-page">
              Renovare baie
            </h3>
            <p className="m-0 text-meta text-ink-3">
              Apartament, str. Teilor 4 · Andrei Pop · 14 oct.
            </p>
          </div>
          <StatusPill>În lucru</StatusPill>
        </div>

        <dl className="m-0 grid grid-cols-2 gap-4 rounded-lg border border-card-border bg-card p-4 shadow-card md:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="flex min-w-0 flex-col gap-1">
              <dt className="text-label uppercase text-ink-3">{kpi.label}</dt>
              <dd className="m-0 truncate text-[22px] font-light leading-7 tracking-[-0.01em] text-ink tabular-nums md:text-kpi">
                {kpi.value}
              </dd>
            </div>
          ))}
          <div className="flex min-w-0 flex-col gap-2">
            <dt className="text-label uppercase text-ink-3">Gata de trimis</dt>
            <dd className="m-0 flex items-center gap-3">
              <TickBar value={84} label="84% gata" className="flex-1" />
              <span className="text-body font-medium text-ink tabular-nums">
                84%
              </span>
            </dd>
          </div>
        </dl>

        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0 rounded-lg border border-card-border bg-card shadow-card">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <h4 className="m-0 flex items-center gap-2 text-title-card text-ink">
                Articole <Count tone="plain">14</Count>
              </h4>
              <span className="text-meta text-ink-3">Capitolul 2 · Baie</span>
            </div>
            <TickRule className="mx-4" />
            <table className="w-full border-collapse text-body">
              <thead>
                <tr className="text-left text-label uppercase text-ink-3">
                  <th className="px-4 py-2 font-medium">Articol</th>
                  <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">
                    Cant.
                  </th>
                  <th className="hidden px-2 py-2 text-right font-medium md:table-cell">
                    Preț
                  </th>
                  <th className="px-4 py-2 text-right font-medium">Valoare</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.code} className="border-t border-border">
                    <td className="px-4 py-2.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-code text-ink-3">
                          {row.code}
                        </span>
                        <span className="text-ink">{row.name}</span>
                        {row.tag && <Badge>{row.tag}</Badge>}
                      </div>
                    </td>
                    <td className="hidden px-2 py-2.5 text-right text-ink-2 tabular-nums sm:table-cell">
                      {row.quantity} {row.unit}
                    </td>
                    <td className="hidden px-2 py-2.5 text-right text-ink-2 tabular-nums md:table-cell">
                      {row.price}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-ink tabular-nums">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-card-border bg-card shadow-card">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <h4 className="m-0 text-title-card text-ink">Verificări</h4>
                <Count>7 din 8</Count>
              </div>
              <TickRule className="mx-4" />
              <ul className="m-0 flex list-none flex-col gap-3 p-4">
                {checks.map((check) => (
                  <li key={check.name} className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                        check.ok
                          ? "bg-success-soft text-success"
                          : "bg-warning-soft text-warning",
                      )}
                    >
                      {check.ok ? (
                        <Check aria-hidden className="size-3.5" />
                      ) : (
                        <TriangleAlert aria-hidden className="size-3.5" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-body font-medium text-ink">
                        {check.name}
                      </span>
                      <span className="text-meta text-ink-3">
                        {check.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 rounded-md border border-ai-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Sparkles aria-hidden className="size-4 text-ai" />
                <h4 className="m-0 text-body font-medium text-ai">
                  Ce trebuie făcut
                </h4>
              </div>
              <p className="m-0 text-meta text-ink-3">
                Devize AI · 10:44 · a citit 14 articole
              </p>
              <p className="m-0 text-body text-ink">
                Lipsește șapa autonivelantă sub gresia din baie, 6,20 mp, din
                articolul de placare.
              </p>
              <span
                className={cn(
                  buttonVariants({ variant: "ai", size: "sm" }),
                  "pointer-events-none self-start",
                )}
              >
                <Sparkles aria-hidden />
                Aplică sugestia
              </span>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
