"use client";

import type * as React from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Pass the app's resolved theme (next-themes) as `theme`.
const Toaster = (props: ToasterProps) => (
  <Sonner
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
          "group toast group-[.toaster]:rounded-md group-[.toaster]:border-card-border group-[.toaster]:bg-card group-[.toaster]:text-body group-[.toaster]:text-ink group-[.toaster]:shadow-raised",
        description: "group-[.toast]:text-meta group-[.toast]:text-ink-2",
        actionButton:
          "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
        cancelButton: "group-[.toast]:bg-secondary group-[.toast]:text-ink",
      },
    }}
    {...props}
  />
);

export { Toaster, toast };
