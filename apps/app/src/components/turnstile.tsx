"use client";

import { useEffect, useRef } from "react";
import { useCurrentLocale } from "@/locales/client";

// Cloudflare Turnstile tells people from scripts. The backend sends a
// sign-in code only for a token it issued (emailSignIn.ts).
const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
// The backend accepts only tokens for this action.
const ACTION = "sign-in";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: Record<string, unknown>,
  ) => string | null | undefined;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onTurnstileLoad?: () => void;
  }
}

let script: Promise<TurnstileApi> | undefined;

/** Cloudflare's script, loaded the first time a challenge shows. */
function loadScript(): Promise<TurnstileApi> {
  script ??= new Promise<TurnstileApi>((resolve, reject) => {
    window.onTurnstileLoad = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
      } else {
        reject(new Error("Turnstile did not load"));
      }
    };
    const element = document.createElement("script");
    element.src = SCRIPT_URL;
    element.async = true;
    element.onerror = () => {
      // The next challenge tries again.
      script = undefined;
      element.remove();
      reject(new Error("Turnstile did not load"));
    };
    document.head.append(element);
  });
  return script;
}

/**
 * Cloudflare's challenge, which shows only when it needs a click. `onToken`
 * gets each token it issues, good for one code, and null once that token
 * expires or the challenge goes away; a new `key` starts a fresh challenge.
 */
export function Turnstile({
  siteKey,
  onToken,
  onError,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const locale = useCurrentLocale();
  // The latest callbacks, so that rendering again keeps the challenge.
  const callbacks = useRef({ onToken, onError });
  useEffect(() => {
    callbacks.current = { onToken, onError };
  });

  useEffect(() => {
    let widgetId: string | null | undefined;
    let removed = false;
    loadScript().then(
      (turnstile) => {
        if (removed || !container.current) {
          return;
        }
        widgetId = turnstile.render(container.current, {
          sitekey: siteKey,
          action: ACTION,
          language: locale,
          theme: "auto",
          size: "flexible",
          appearance: "interaction-only",
          "response-field": false,
          callback: (token: string) => callbacks.current.onToken(token),
          "expired-callback": () => callbacks.current.onToken(null),
          "error-callback": () => {
            callbacks.current.onToken(null);
            callbacks.current.onError();
          },
        });
      },
      () => callbacks.current.onError(),
    );
    return () => {
      removed = true;
      if (widgetId) {
        window.turnstile?.remove(widgetId);
      }
      callbacks.current.onToken(null);
    };
  }, [siteKey, locale]);

  // Only what Turnstile shows takes a place in the form's layout.
  return <div ref={container} className="contents" />;
}
