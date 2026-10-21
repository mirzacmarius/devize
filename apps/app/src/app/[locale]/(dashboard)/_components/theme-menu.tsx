"use client";

import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@devize/ui/dropdown-menu";
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

/** The account menu's theme choice: light, dark or the system's. */
export function ThemeMenu() {
  const t = useScopedI18n("theme");
  const tNavigation = useScopedI18n("navigation");
  const { theme, setTheme } = useTheme();
  const current = isTheme(theme) ? theme : "system";
  const Icon = icons[current];
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon aria-hidden />
        {tNavigation("theme")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={current} onValueChange={setTheme}>
          {themes.map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {t(value)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
