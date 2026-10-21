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
  const { doubleCheck, getButtonProps } = useDoubleCheck();

  const handleUpdateUserImage = (uploaded: UploadedFile[]) => {
    const [file] = uploaded;
    if (!file) {
      return;
    }
    return updateUserImage({ imageId: file.storageId as Id<"_storage"> });
  };

  const handleDeleteAccount = async () => {
    await deleteCurrentUserAccount();
    await signOut();
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
            accept="image/*"
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

      <Card className="overflow-hidden border-danger-border">
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle>{t("deleteAccount.title")}</CardTitle>
            <CardDescription>{t("deleteAccount.description")}</CardDescription>
          </div>
        </CardHeader>
        <CardFooter className={cn(footer, "border-danger-border")}>
          <p className="m-0 text-meta text-danger">
            {t("deleteAccount.warning")}
          </p>
          <Button
            size="sm"
            variant="destructive"
            {...getButtonProps({
              onClick: doubleCheck ? handleDeleteAccount : undefined,
            })}
          >
            {doubleCheck
              ? t("deleteAccount.confirm")
              : t("deleteAccount.button")}
          </Button>
        </CardFooter>
      </Card>
    </>
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
