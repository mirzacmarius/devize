import { Label } from "@devize/ui/label";
import { cn } from "@devize/ui/utils";
import type { ReactNode } from "react";

/** A form control with its label, and a hint or an error under it. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid min-w-0 content-start gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="m-0 text-meta text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="m-0 text-meta text-ink-3">{hint}</p>
      )}
    </div>
  );
}
