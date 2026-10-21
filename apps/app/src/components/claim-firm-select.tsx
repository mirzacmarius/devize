"use client";

import type { Id } from "@devize/backend/convex/_generated/dataModel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { Field } from "./field";

// Radix Select keeps "" for "nothing chosen", so "a new firm" needs a value.
export const NEW_FIRM = "new";

export type FirmChoice = Id<"organizations"> | typeof NEW_FIRM;

/** The firm to send with a claim: undefined creates the producer's own. */
export function chosenFirm(
  choice: FirmChoice,
): Id<"organizations"> | undefined {
  return choice === NEW_FIRM ? undefined : choice;
}

/**
 * Which firm takes a Producător's profile over: a Producător firm of the
 * person's that holds no profile yet, or a new one named after the producer.
 */
export function ClaimFirmSelect({
  id,
  firms,
  value,
  onChange,
  label,
  newLabel,
  hint,
}: {
  id: string;
  firms: { _id: Id<"organizations">; name: string }[];
  value: FirmChoice;
  onChange: (value: FirmChoice) => void;
  label: string;
  newLabel: string;
  hint?: string;
}) {
  if (firms.length === 0) {
    return (
      <Field label={label} hint={hint}>
        <p className="m-0 text-body text-ink">{newLabel}</p>
      </Field>
    );
  }
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as FirmChoice)}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {firms.map((firm) => (
            <SelectItem key={firm._id} value={firm._id}>
              {firm.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NEW_FIRM}>{newLabel}</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}
