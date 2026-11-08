"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@devize/ui/button";

/** Google's "G", in its own colours, as its sign-in guidelines ask. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden className="size-[18px]">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/** Sign-in with Google, which comes back to `next`, a path on this site. */
export function GoogleSignin({
  label,
  next,
}: {
  label: string;
  next?: string;
}) {
  const { signIn } = useAuthActions();

  return (
    <Button
      onClick={() => signIn("google", next ? { redirectTo: next } : undefined)}
      variant="outline"
      size="lg"
      className="w-full"
    >
      <GoogleMark />
      {label}
    </Button>
  );
}
