"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@devize/ui/select";
import { cn } from "@devize/ui/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useScopedI18n } from "@/locales/client";

const themes = ["light", "dark", "system"] as const;
type Theme = (typeof themes)[number];

const icons = { light: Sun, dark: Moon, system: Monitor } satisfies Record<
  Theme,
  unknown
>;

function isTheme(value: string | undefined): value is Theme {
  return themes.some((theme) => theme === value);
}

export function ThemeSwitcher({ triggerClass }: { triggerClass?: string }) {
  const t = useScopedI18n("theme");
  const { theme: storedTheme, setTheme } = useTheme();
  const currentTheme = isTheme(storedTheme) ? storedTheme : "system";
  const Icon = icons[currentTheme];
  return (
    <Select value={currentTheme} onValueChange={setTheme}>
      <SelectTrigger
        className={cn(
          "h-6 rounded border-primary/20 bg-secondary !px-2 hover:border-primary/40",
          triggerClass,
        )}
      >
        <div className="flex items-start gap-2">
          <Icon className="h-[14px] w-[14px]" />
          <span className="text-xs font-medium">{t(currentTheme)}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {themes.map((theme) => (
          <SelectItem
            key={theme}
            value={theme}
            className={cn(
              "text-sm font-medium text-primary/60",
              theme === currentTheme && "text-primary",
            )}
          >
            {t(theme)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
