"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc, Id } from "@devize/backend/convex/_generated/dataModel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { useQuery } from "convex/react";
import { useFirm } from "@/components/firm-provider";
import { counties } from "@/lib/counties";
import { useScopedI18n } from "@/locales/client";

// Radix Select keeps "" for "nothing chosen", so "no client" needs a value.
const NONE = "none";

export type Store = NonNullable<Doc<"estimates">["preferredStore"]>;
export const stores: readonly Store[] = [
  "dedeman",
  "leroy_merlin",
  "hornbach",
  "brico_depot",
];

/** Picks one of the firm's clients, or none. */
export function ClientSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: Id<"clients"> | null;
  onChange: (value: Id<"clients"> | null) => void;
  disabled?: boolean;
}) {
  const t = useScopedI18n("estimates");
  const { firm } = useFirm();
  const clients = useQuery(api.accounts.clients.list, {
    organizationId: firm._id,
  });
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(next) =>
        onChange(next === NONE ? null : (next as Id<"clients">))
      }
      disabled={disabled}
    >
      <SelectTrigger id={id} className="min-w-0 flex-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("noClient")}</SelectItem>
        {clients && clients.length > 0 && <SelectSeparator />}
        {clients?.map((client) => (
          <SelectItem key={client._id} value={client._id}>
            {client.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Picks a county, or none. */
export function CountySelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const t = useScopedI18n("estimates");
  return (
    <Select
      value={value || NONE}
      onValueChange={(next) => onChange(next === NONE ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("noCounty")}</SelectItem>
        <SelectSeparator />
        {counties.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Picks the retailer whose prices come first, or none (the cheapest wins). */
export function StoreSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: Store | null;
  onChange: (value: Store | null) => void;
  disabled?: boolean;
}) {
  const t = useScopedI18n("stores");
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(next) => onChange(next === NONE ? null : (next as Store))}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("cheapest")}</SelectItem>
        <SelectSeparator />
        {stores.map((store) => (
          <SelectItem key={store} value={store}>
            {t(store)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
