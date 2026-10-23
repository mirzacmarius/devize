import { Badge } from "@devize/ui/badge";
import { buttonVariants } from "@devize/ui/button";
import { cn } from "@devize/ui/utils";
import { Check } from "lucide-react";
import { type Plan, plans, producerPlan } from "@/content/pricing";
import { appLinks } from "@/lib/links";

const lei = new Intl.NumberFormat("ro-RO");

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <li
      className={cn(
        "relative flex list-none flex-col gap-6 rounded-lg border bg-card p-6 shadow-card",
        plan.recommended ? "border-ink" : "border-card-border",
      )}
    >
      {plan.recommended && (
        <span className="absolute right-5 top-5 rounded-full bg-brand px-2.5 py-0.5 text-pill text-brand-foreground">
          Recomandat
        </span>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-title-card text-ink">{plan.name}</h3>
        <p className="m-0 min-h-10 text-meta text-ink-3">{plan.tagline}</p>
      </div>
      <p className="m-0 flex items-baseline gap-2">
        <span className="text-[40px] font-light leading-none tracking-[-0.02em] text-ink tabular-nums">
          {lei.format(plan.price)} lei
        </span>
        <span className="text-meta text-ink-3">pe lună, pe firmă</span>
      </p>
      <a
        href={appLinks.start}
        className={buttonVariants({
          variant: plan.recommended ? "default" : "outline",
          size: "lg",
        })}
      >
        {plan.cta}
      </a>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {plan.features.map((feature) => (
          <li
            key={feature.text}
            className="flex items-start gap-2.5 text-body text-ink-2"
          >
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
            <span>
              {feature.text}
              {feature.soon && (
                <>
                  {" "}
                  <Badge>în curând</Badge>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function PricingCards() {
  return (
    <ul className="m-0 grid gap-4 p-0 md:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </ul>
  );
}

export function ProducerPlanCard() {
  return (
    <div className="grid gap-6 rounded-lg border border-card-border bg-card p-6 shadow-card md:grid-cols-[1fr_1fr_1fr]">
      <div className="flex flex-col gap-2">
        <h3 className="m-0 text-title-card text-ink">{producerPlan.name}</h3>
        <p className="m-0 text-body text-ink-2">{producerPlan.note}</p>
        <a
          href={appLinks.producers}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-2 self-start",
          )}
        >
          Revendică profilul
        </a>
      </div>
      <div className="flex flex-col gap-3">
        <p className="m-0 text-label uppercase text-ink-3">Gratuit</p>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {producerPlan.free.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-body text-ink-2"
            >
              <Check
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-ink-3"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-3">
        <p className="m-0 text-label uppercase text-ink-3">Plan plătit</p>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {producerPlan.paid.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-body text-ink-2"
            >
              <Check
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-ink-3"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
