"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { NormForm } from "../_components/norm-form";

/**
 * A new norm's form, on the producer's side when the producer profile's
 * "Normă nouă" opens it. Following a link to it starts an empty form, though
 * Next.js keeps the page from an earlier visit (ADR 0029); Back and Forward
 * find it as it was left, until a link opens it again.
 */
export function NewNorm() {
  const owner = useSearchParams().get("for");
  const { bfcacheId } = useRouter();
  return (
    <NormForm
      key={bfcacheId}
      initialOwner={owner === "producer" ? "manufacturer" : "organization"}
    />
  );
}
