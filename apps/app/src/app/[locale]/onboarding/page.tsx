"use client";

import { api } from "@devize/backend/convex/_generated/api";
import * as validators from "@devize/backend/convex/utils/validators";
import { Button } from "@devize/ui/button";
import { Card } from "@devize/ui/card";
import { Input } from "@devize/ui/input";
import { cn } from "@devize/ui/utils";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useScopedI18n } from "@/locales/client";

export default function OnboardingUsername() {
  const t = useScopedI18n("onboarding");
  const tUsername = useScopedI18n("username");
  const user = useQuery(api.users.getUser);
  const updateUsername = useMutation(api.users.updateUsername);
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      username: "",
    },
    validators: {
      onSubmit: ({ value }) =>
        validators.username.safeParse(value.username).success
          ? undefined
          : { fields: { username: tUsername("invalid") } },
    },
    onSubmit: async ({ value }) => {
      await updateUsername({
        username: value.username,
      });
    },
  });

  useEffect(() => {
    if (user?.username) {
      router.push("/");
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto grid w-full max-w-[400px] flex-1 content-center gap-4 pb-24">
      <Card className="grid gap-6 p-6 sm:p-8">
        <div className="grid gap-1.5">
          <h1 className="m-0 text-title-screen text-ink">{t("title")}</h1>
          <p className="m-0 text-body text-ink-2">{t("description")}</p>
        </div>
        <form
          className="grid w-full gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field name="username">
            {(field) => (
              <div className="flex w-full flex-col gap-1.5">
                <label
                  htmlFor={field.name}
                  className="text-meta font-medium text-ink"
                >
                  {tUsername("label")}
                </label>
                <Input
                  id={field.name}
                  placeholder={tUsername("placeholder")}
                  autoComplete="off"
                  required
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={field.state.meta.errors.length > 0}
                  className={cn(
                    field.state.meta.errors.length > 0 &&
                      "border-danger focus-visible:border-danger focus-visible:ring-danger/15",
                  )}
                />
                {field.state.meta.errors.length > 0 && (
                  <span className="text-meta text-danger">
                    {field.state.meta.errors.join(" ")}
                  </span>
                )}
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  t("continue")
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </Card>
      <p className="m-0 text-center text-meta text-ink-3">{t("hint")}</p>
    </div>
  );
}
