"use client";

import { api } from "@devize/backend/convex/_generated/api";
import { Button } from "@devize/ui/button";
import { Input } from "@devize/ui/input";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import { ErrorText, Field, Panel, useRun } from "../../../_components/ui";
import type { Contact, Manufacturer } from "./types";

function domainOf(manufacturer: Manufacturer, contacts: Contact[]) {
  const email = contacts.find((contact) => contact.email)?.email;
  if (email) {
    return email.slice(email.lastIndexOf("@"));
  }
  try {
    const website = manufacturer.website ?? "";
    const url = new URL(
      website.includes("://") ? website : `https://${website}`,
    );
    return `@${url.hostname.replace(/^www\./, "")}`;
  } catch {
    return "";
  }
}

/** For a company that asked us to stop: no address on its domain is written to again. */
export function ExcludePanel({
  manufacturer,
  contacts,
}: {
  manufacturer: Manufacturer;
  contacts: Contact[];
}) {
  const t = useScopedI18n("admin.manufacturer.exclude");
  const suppress = useMutation(api.manufacturers.outreach.suppress);
  const [domain, setDomain] = useState(() => domainOf(manufacturer, contacts));
  const { run, error, pending } = useRun();

  if (manufacturer.status === "excluded") {
    return null;
  }
  return (
    <Panel title={t("title")} description={t("description")}>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          run(() =>
            suppress({
              value: domain.startsWith("@") ? domain : `@${domain}`,
              manufacturerId: manufacturer._id,
            }),
          );
        }}
      >
        <Field label={t("domain")} htmlFor="exclude_domain">
          <Input
            id="exclude_domain"
            className="w-72"
            value={domain}
            required
            onChange={(event) => setDomain(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="destructive" disabled={pending}>
          {t("button")}
        </Button>
      </form>
      <ErrorText error={error} />
    </Panel>
  );
}
