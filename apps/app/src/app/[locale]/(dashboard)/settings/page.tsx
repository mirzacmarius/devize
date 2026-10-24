"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@devize/backend/convex/_generated/api";
import type { Id } from "@devize/backend/convex/_generated/dataModel";
import * as validators from "@devize/backend/convex/utils/validators";
import { Avatar, AvatarFallback, AvatarImage } from "@devize/ui/avatar";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@devize/ui/card";
import { Input } from "@devize/ui/input";
import { type UploadedFile, UploadInput } from "@devize/ui/upload-input";
import { cn, useDoubleCheck } from "@devize/ui/utils";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { Upload } from "lucide-react";
import { useState } from "react";
import { InvoiceArchiveButton } from "@/components/invoice-archive";
import { useRun } from "@/components/use-run";
import { initials } from "@/lib/initials";
import { useScopedI18n } from "@/locales/client";

// A settings card's footer: a hint on the left, the card's action on the right.
const footer = "justify-between border-t bg-sunken py-3";

export default function DashboardSettings() {
  const t = useScopedI18n("settings");
  const user = useQuery(api.users.getUser);
  const { signOut } = useAuthActions();
  const updateUserImage = useMutation(api.users.updateUserImage);
  const removeUserImage = useMutation(api.users.removeUserImage);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const deleteCurrentUserAccount = useMutation(
    api.users.deleteCurrentUserAccount,
  );
  const run = useRun();

  const handleUpdateUserImage = (uploaded: UploadedFile[]) => {
    const [file] = uploaded;
    if (!file) {
      return;
    }
    return run(() =>
      updateUserImage({ imageId: file.storageId as Id<"_storage"> }),
    );
  };

  const handleDeleteAccount = async (deleteInvoices: boolean) => {
    const result = await run(() =>
      deleteCurrentUserAccount({ deleteInvoices }),
    );
    if (result.ok) {
      await signOut();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="items-start">
          <div className="grid gap-1">
            <CardTitle>{t("avatar.title")}</CardTitle>
            <CardDescription>{t("avatar.description")}</CardDescription>
          </div>
          <label
            htmlFor="avatar_field"
            className="group relative flex shrink-0 cursor-pointer overflow-hidden rounded-full transition active:scale-95"
          >
            <span className="sr-only">{t("avatar.change")}</span>
            <Avatar className="size-16">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
              <AvatarFallback className="text-[20px]">
                {initials(user.name ?? user.email ?? "")}
              </AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-white group-hover:flex">
              <Upload aria-hidden className="size-5" />
            </span>
          </label>
          <UploadInput
            id="avatar_field"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="peer sr-only"
            required
            tabIndex={user ? -1 : 0}
            generateUploadUrl={generateUploadUrl}
            onUploadComplete={handleUpdateUserImage}
          />
        </CardHeader>
        <CardFooter className={footer}>
          <p className="m-0 text-meta text-ink-3">{t("avatar.uploadHint")}</p>
          {user.avatarUrl && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                removeUserImage({});
              }}
            >
              {t("avatar.reset")}
            </Button>
          )}
        </CardFooter>
      </Card>

      <UsernameForm username={user.username ?? ""} />

      <DeleteAccountCard onDelete={handleDeleteAccount} />
    </>
  );
}

/**
 * Deleting the account, and what goes with it: each firm the user is the
 * only member of, with its invoices. A firm with numbered invoices offers
 * their archive first and asks the user to confirm they go too (ADR 0050).
 */
function DeleteAccountCard({
  onDelete,
}: {
  onDelete: (deleteInvoices: boolean) => Promise<void>;
}) {
  const t = useScopedI18n("settings.deleteAccount");
  const firms = useQuery(api.users.deletionPreview);
  const { doubleCheck, getButtonProps } = useDoubleCheck();
  const [confirmed, setConfirmed] = useState(false);
  const withInvoices = (firms ?? []).some((firm) => firm.invoices > 0);
  const blocked = firms === undefined || (withInvoices && !confirmed);

  return (
    <Card className="overflow-hidden border-danger-border">
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
      </CardHeader>
      {firms && firms.length > 0 && (
        <CardContent className="gap-3">
          {firms.map((firm) => (
            <div
              key={firm._id}
              className="grid gap-2 rounded-md border border-border p-3"
            >
              <p className="m-0 font-medium text-ink">
                {t("firmTitle", { firm: firm.name })}
              </p>
              <p className="m-0 text-meta text-ink-2">{t("firmDescription")}</p>
              {firm.invoices > 0 && (
                <>
                  <p className="m-0 text-body text-danger">
                    {firm.invoices > 100
                      ? t("manyInvoices")
                      : t("invoices", { count: firm.invoices })}
                  </p>
                  <p className="m-0 text-meta text-ink-2">{t("law")}</p>
                  <div>
                    <InvoiceArchiveButton
                      size="sm"
                      organizationId={firm._id}
                      firmName={firm.name}
                    />
                  </div>
                </>
              )}
            </div>
          ))}
          {withInvoices && (
            <label className="flex items-start gap-3 text-body text-ink">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              {t("confirmInvoices")}
            </label>
          )}
        </CardContent>
      )}
      <CardFooter className={cn(footer, "border-danger-border")}>
        <p className="m-0 text-meta text-danger">{t("warning")}</p>
        <Button
          size="sm"
          variant="destructive"
          disabled={blocked}
          {...getButtonProps({
            onClick: doubleCheck ? () => onDelete(confirmed) : undefined,
          })}
        >
          {doubleCheck ? t("confirm") : t("button")}
        </Button>
      </CardFooter>
    </Card>
  );
}

/** Rendered once the user has loaded, so the field starts with their username. */
function UsernameForm({ username }: { username: string }) {
  const t = useScopedI18n("settings");
  const tUsername = useScopedI18n("username");
  const updateUsername = useMutation(api.users.updateUsername);
  const form = useForm({
    defaultValues: { username },
    validators: {
      onSubmit: ({ value }) =>
        validators.username.safeParse(value.username).success
          ? undefined
          : { fields: { username: tUsername("invalid") } },
    },
    onSubmit: async ({ value }) => {
      await updateUsername({ username: value.username });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle>{t("username.title")}</CardTitle>
            <CardDescription>{t("username.description")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form.Field name="username">
            {(field) => (
              <div className="grid gap-2">
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
                  className={cn(
                    "max-w-80",
                    field.state.meta.errors.length > 0 &&
                      "border-danger focus-visible:ring-danger",
                  )}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="m-0 text-meta text-danger">
                    {field.state.meta.errors.join(" ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </CardContent>
        <CardFooter className={footer}>
          <p className="m-0 text-meta text-ink-3">{tUsername("rules")}</p>
          <Button type="submit" size="sm">
            {t("username.save")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
