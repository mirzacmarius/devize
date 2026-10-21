"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@devize/ui/button";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import { Label } from "@devize/ui/label";
import { type FormEvent, useEffect, useState } from "react";
import { useScopedI18n } from "@/locales/client";

// Matches the backend's emailSignIn.ts.
const PROVIDER = "email-code";
const CODE_LENGTH = 8;
const RESEND_AFTER_SECONDS = 30;

/**
 * Sign-in with a code sent by email: the address first, then the 8 digits
 * from the email. Nothing redirects, so it works on any address of the app.
 */
export function EmailSignIn() {
  const t = useScopedI18n("login");
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  // Counts down to when another code can be asked for.
  useEffect(() => {
    if (wait <= 0) {
      return;
    }
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const sendCode = async (address: string) => {
    setBusy(true);
    setError(undefined);
    try {
      await signIn(PROVIDER, { email: address });
      setSentTo(address);
      setCode("");
      setWait(RESEND_AFTER_SECONDS);
    } catch (cause) {
      setError(
        String(cause).includes("rate_limited")
          ? t("tooManyCodes")
          : t("sendFailed"),
      );
    } finally {
      setBusy(false);
    }
  };

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError(t("emailInvalid"));
      return;
    }
    void sendCode(address);
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    const digits = code.replace(/\D/g, "");
    if (!sentTo) {
      return;
    }
    if (digits.length !== CODE_LENGTH) {
      setError(t("codeLength"));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await signIn(PROVIDER, { email: sentTo, code: digits });
      // A full load, so the server sees the new session cookie.
      window.location.assign("/");
    } catch {
      setError(t("codeWrong"));
      setBusy(false);
    }
  };

  if (!sentTo) {
    return (
      <form className="grid gap-3 text-left" onSubmit={submitEmail} noValidate>
        <div className="grid gap-1.5">
          <Label htmlFor="sign-in-email">{t("email")}</Label>
          <Input
            id="sign-in-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("emailPlaceholder")}
            aria-invalid={error !== undefined}
            aria-describedby={error ? "sign-in-error" : undefined}
          />
        </div>
        {error && (
          <p
            id="sign-in-error"
            role="alert"
            className="m-0 text-meta text-danger"
          >
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("sendCode")}
        </Button>
      </form>
    );
  }

  return (
    <form className="grid gap-3 text-left" onSubmit={submitCode} noValidate>
      <p className="m-0 text-body text-ink-2" aria-live="polite">
        {t("codeSent", { email: sentTo })}
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="sign-in-code">{t("code")}</Label>
        <Input
          id="sign-in-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH + 3}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="12345678"
          className="font-mono tracking-[0.2em]"
          aria-invalid={error !== undefined}
          aria-describedby={error ? "sign-in-error" : undefined}
          autoFocus
        />
      </div>
      {error && (
        <p
          id="sign-in-error"
          role="alert"
          className="m-0 text-meta text-danger"
        >
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        {busy && <Icons.Loader className="animate-spin" aria-hidden />}
        {t("verify")}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="link"
          onClick={() => {
            setSentTo(null);
            setError(undefined);
          }}
        >
          {t("otherEmail")}
        </Button>
        <Button
          type="button"
          variant="link"
          disabled={busy || wait > 0}
          onClick={() => void sendCode(sentTo)}
        >
          {wait > 0 ? t("resendIn", { seconds: wait }) : t("resend")}
        </Button>
      </div>
    </form>
  );
}
