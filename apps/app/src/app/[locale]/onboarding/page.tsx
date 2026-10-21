"use client";

import { api } from "@devize/backend/convex/_generated/api";
import * as validators from "@devize/backend/convex/utils/validators";
import { Button } from "@devize/ui/button";
import { Input } from "@devize/ui/input";
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
    <div className="mx-auto flex h-full w-full max-w-96 flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <span className="mb-2 select-none text-6xl">👋</span>
        <h3 className="text-center text-2xl font-medium text-primary">
          {t("title")}
        </h3>
        <p className="text-center text-base font-normal text-primary/60">
          {t("description")}
        </p>
      </div>
      <form
        className="flex w-full flex-col items-start gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field name="username">
          {(field) => (
            <div className="flex w-full flex-col gap-1.5">
              <label htmlFor={field.name} className="sr-only">
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
                className={`bg-transparent ${
                  field.state.meta.errors.length > 0 &&
                  "border-destructive focus-visible:ring-destructive"
                }`}
              />
              {field.state.meta.errors.length > 0 && (
                <span className="mb-2 text-sm text-destructive dark:text-destructive-foreground">
                  {field.state.meta.errors.join(" ")}
                </span>
              )}
            </div>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              size="sm"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                t("continue")
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <p className="px-6 text-center text-sm font-normal leading-normal text-primary/60">
        {t("hint")}
      </p>
    </div>
  );
}
