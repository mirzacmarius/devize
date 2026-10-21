import { cn } from "../utils";

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  [key: string]: unknown | undefined;
}

// Provisional Devize mark until there is a real logo: a D on a `brand` tile.
// Keep it small (sidebar, app icon); official forms and PDFs show the
// estimating company's own name instead.
export function Logo({ width, height, className, ...args }: LogoProps) {
  return (
    <svg
      {...args}
      width={width ?? 28}
      height={height ?? 28}
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      viewBox="0 0 28 28"
      fill="none"
      role="img"
      aria-label="Devize"
    >
      <rect width="28" height="28" rx="8" className="fill-brand" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.5 7.5H13.5A6.5 6.5 0 0 1 13.5 20.5H8.5ZM11.7 10.7V17.3H13.5A3.3 3.3 0 0 0 13.5 10.7Z"
        className="fill-brand-foreground"
      />
    </svg>
  );
}
