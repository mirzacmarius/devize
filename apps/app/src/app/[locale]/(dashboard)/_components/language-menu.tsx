"use client";

import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@devize/ui/dropdown-menu";
import { Languages } from "lucide-react";
import {
  useChangeLocale,
  useCurrentLocale,
  useScopedI18n,
} from "@/locales/client";
import { isLocale, localeNames, locales } from "@/locales/locale";

/** The account menu's language choice, each language in its own words. */
export function LanguageMenu() {
  const t = useScopedI18n("navigation");
  const changeLocale = useChangeLocale();
  const locale = useCurrentLocale();
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Languages aria-hidden />
        {t("language")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => {
            if (isLocale(value)) changeLocale(value);
          }}
        >
          {locales.map((value) => (
            <DropdownMenuRadioItem key={value} value={value} lang={value}>
              {localeNames[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
