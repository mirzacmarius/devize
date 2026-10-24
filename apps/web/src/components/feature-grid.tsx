import { cn } from "@devize/ui/utils";
import type { Feature } from "@/content/features";

export function FeatureCard({
  feature,
  className,
}: {
  feature: Feature;
  className?: string;
}) {
  const Icon = feature.icon;
  return (
    <li
      className={cn(
        "flex list-none flex-col gap-3 rounded-lg border border-card-border bg-card p-5 shadow-card",
        className,
      )}
    >
      <span className="inline-flex size-9 items-center justify-center rounded-md bg-tile text-ink">
        <Icon aria-hidden className="size-[18px]" />
      </span>
      <h3 className="m-0 text-title-card text-ink">{feature.title}</h3>
      <p className="m-0 text-pretty text-body text-ink-2">
        {feature.description}
      </p>
    </li>
  );
}

export function FeatureGrid({
  features,
  columns = 4,
}: {
  features: ReadonlyArray<Feature>;
  columns?: 3 | 4;
}) {
  return (
    <ul
      className={cn(
        "m-0 grid gap-4 p-0 sm:grid-cols-2",
        columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
      )}
    >
      {features.map((feature) => (
        <FeatureCard key={feature.title} feature={feature} />
      ))}
    </ul>
  );
}
