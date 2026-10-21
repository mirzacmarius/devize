import { cn } from "@devize/ui/utils";
import { SIGNATURE_HEIGHT, SIGNATURE_WIDTH } from "./signature-path";

/** A signature drawn on an Ofertă's page, shown again as it was drawn. */
export function SignatureImage({
  path,
  label,
  className,
}: {
  path: string;
  // What a screen reader says instead: "Semnătura lui Ion Popescu".
  label: string;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${SIGNATURE_WIDTH} ${SIGNATURE_HEIGHT}`}
      role="img"
      aria-label={label}
      className={cn("block aspect-[3/1] w-full text-ink", className)}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
