"use client";

import { useRouter } from "next/navigation";
import { FirmForm } from "@/components/firm-form";
import { useScopedI18n } from "@/locales/client";

/** The second step after sign-up: every Deviz, client and rate belongs to a Firmă. */
export default function OnboardingFirm() {
  const t = useScopedI18n("firm");
  const router = useRouter();
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col justify-center gap-8 px-4 py-24">
      <div className="grid gap-2">
        <h1 className="m-0 text-title-page text-ink">{t("onboardingTitle")}</h1>
        <p className="m-0 text-body-lg text-ink-2">
          {t("onboardingDescription")}
        </p>
      </div>
      <FirmForm onCreated={() => router.push("/estimates")} />
    </div>
  );
}
