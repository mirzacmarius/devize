import { Badge } from "@devize/ui/badge";
import { roadmap } from "@/content/features";

/** What is being built now, so the site says only what is true. */
export function Roadmap() {
  return (
    <ul className="m-0 grid gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {roadmap.map((item) => (
        <li
          key={item.title}
          className="flex list-none flex-col gap-2 rounded-lg border border-dashed border-border p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="m-0 text-title-card text-ink">{item.title}</h3>
            <Badge>în lucru</Badge>
          </div>
          <p className="m-0 text-pretty text-body text-ink-2">
            {item.description}
          </p>
        </li>
      ))}
    </ul>
  );
}
