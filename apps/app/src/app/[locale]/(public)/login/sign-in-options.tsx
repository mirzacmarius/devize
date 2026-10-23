"use client";

import { useSearchParams } from "next/navigation";
import { EmailSignIn } from "@/components/email-sign-in";
import { GoogleSignin } from "@/components/google-signin";
import { returnPath } from "@/lib/return-path";
import { useScopedI18n } from "@/locales/client";

/**
 * The ways to sign in. Both lead back to the page that sent people here, such
 * as an invitation, which the address names; it is read here rather than on
 * the server so the page is ready before anyone arrives (ADR 0029).
 */
export function SignInOptions({ withGoogle }: { withGoogle: boolean }) {
  const t = useScopedI18n("login");
  const next = returnPath(useSearchParams().get("next"));
  return (
    <div className="grid w-full gap-4">
      <EmailSignIn next={next} />
      {withGoogle && (
        <>
          <div className="flex items-center gap-3 text-meta text-ink-3">
            <span aria-hidden className="h-px flex-1 bg-border" />
            {t("or")}
            <span aria-hidden className="h-px flex-1 bg-border" />
          </div>
          <GoogleSignin label={t("google")} next={next} />
        </>
      )}
    </div>
  );
}
