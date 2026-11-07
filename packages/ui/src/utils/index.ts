import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

export * from "./use-double-check";

/**
 * Returns a function that calls all of its arguments.
 */
export function callAll<Args extends unknown[]>(
  ...fns: (((...args: Args) => unknown) | undefined)[]
) {
  return (...args: Args) => {
    for (const fn of fns) fn?.(...args);
  };
}

// The Devize type styles are custom font sizes (tailwind.config.ts). Without
// this, tailwind-merge reads `text-body` as a color and drops it next to
// `text-ink`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "title-page",
            "title-screen",
            "hero",
            "kpi",
            "stat",
            "figure",
            "title-card",
            "body-lg",
            "body",
            "meta",
            "pill",
            "label",
            "caption",
            "head",
            "code",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
