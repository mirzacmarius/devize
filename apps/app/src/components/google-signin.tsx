"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@devize/ui/button";

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
      className="w-full"
    >
      {label}
    </Button>
  );
}
