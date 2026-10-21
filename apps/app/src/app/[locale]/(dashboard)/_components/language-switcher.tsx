"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@devize/ui/select";
import { Languages } from "lucide-react";
import { useChangeLocale, useCurrentLocale } from "@/locales/client";
import { localeNames, locales } from "@/locales/locale";

export function LanguageSwitcher() {
  const changeLocale = useChangeLocale();
  const locale = useCurrentLocale();

  return (
    <Select value={locale} onValueChange={changeLocale}>
      <SelectTrigger className="h-6 rounded border-primary/20 bg-secondary !px-2 hover:border-primary/40">
        <div className="flex items-start gap-2">
          <Languages className="h-[14px] w-[14px]" />
          <span className="text-xs font-medium">{localeNames[locale]}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {locales.map((value) => (
          <SelectItem
            key={value}
            value={value}
            lang={value}
            className="text-sm font-medium text-primary/60"
          >
            {localeNames[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
