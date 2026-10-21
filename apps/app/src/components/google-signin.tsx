"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@devize/ui/button";

export function GoogleSignin({ label }: { label: string }) {
  const { signIn } = useAuthActions();

  return (
    <Button
      onClick={() => signIn("google")}
      variant="outline"
      className="w-full"
    >
      {label}
    </Button>
  );
}
