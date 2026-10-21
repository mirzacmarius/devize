import { Sparkles } from "lucide-react";
import * as React from "react";

import { cn } from "../utils";

export interface AISuggestionProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  // "Ce trebuie făcut", "Tipar"
  title?: React.ReactNode;
  // "Aplică sugestiile": <Button variant="ai" size="sm">. AI suggests, the
  // person applies; nothing changes prices or quantities without this click.
  actions?: React.ReactNode;
  // default: the "Ce trebuie făcut" card; side: one action on the right;
  // inline: an AI note inside a card, without a background.
  variant?: "default" | "side" | "inline";
}

const AISuggestion = React.forwardRef<HTMLElement, AISuggestionProps>(
  (
    { title, actions, variant = "default", className, children, ...props },
    ref,
  ) => (
    <aside
      ref={ref}
      aria-label="Sugestie AI"
      className={cn(
        "grid gap-3 text-ink",
        variant === "side"
          ? "grid-cols-[auto_minmax(0,1fr)_auto] items-center"
          : "grid-cols-[auto_minmax(0,1fr)]",
        variant !== "inline" &&
          "rounded-md border border-ai-border bg-ai-soft px-5 py-4",
        className,
      )}
      {...props}
    >
      <Sparkles className="mt-px size-[18px] text-ai" aria-hidden />
      <div className="grid min-w-0 gap-1">
        {title && <p className="m-0 text-body font-medium text-ai">{title}</p>}
        <div className="text-body">{children}</div>
        {actions && variant === "default" && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {actions}
          </div>
        )}
      </div>
      {actions && variant === "side" && actions}
    </aside>
  ),
);
AISuggestion.displayName = "AISuggestion";

// The source line of anything AI produced: "Devize AI · 10:44 · gresie, adeziv".
function AIMeta({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("text-meta text-ai", className)} {...props} />;
}

export { AIMeta, AISuggestion };
