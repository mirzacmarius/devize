"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc, Id } from "@devize/backend/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@devize/ui/avatar";
import { Button } from "@devize/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  TickRule,
} from "@devize/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@devize/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@devize/ui/dropdown-menu";
import { Icons } from "@devize/ui/icons";
import { Input } from "@devize/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@devize/ui/select";
import { toast } from "@devize/ui/sonner";
import { StatusPill, type StatusPillProps } from "@devize/ui/status-pill";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/field";
import { useFirm } from "@/components/firm-provider";
import { useRun } from "@/components/use-run";
import { formatDay } from "@/lib/format";
import { initials } from "@/lib/initials";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";

type Role = Doc<"memberships">["role"];
type InvitedRole = Doc<"invitations">["role"];
type Member = FunctionReturnType<
  typeof api.accounts.organizations.listMembers
>[number];
type Invitation = FunctionReturnType<
  typeof api.accounts.invitations.listForOrganization
>[number];

const roles: Role[] = ["owner", "admin", "member"];
const invitedRoles: InvitedRole[] = ["member", "admin"];

const emailTones: Record<Invitation["emailStatus"], StatusPillProps["tone"]> = {
  sending: "neutral",
  sent: "success",
  not_sent: "warning",
};

/** An invitation's link on the address the app is open at. */
const inviteLink = (token: string) =>
  `${window.location.origin}/invite/${token}`;

/**
 * Who works in the Firmă and with what role, and the colleagues invited.
 * Owners change roles; owners and admins invite and remove members; anyone
 * may leave, except the last owner.
 */
export function MembersSettings() {
  const { firm } = useFirm();
  const isAdmin = firm.role === "owner" || firm.role === "admin";
  return (
    <>
      <MembersCard isAdmin={isAdmin} />
      {isAdmin && <InvitationsCard />}
    </>
  );
}

function MembersCard({ isAdmin }: { isAdmin: boolean }) {
  const t = useScopedI18n("settings.members");
  const tFirm = useScopedI18n("firm");
  const tc = useScopedI18n("common");
  const { firm } = useFirm();
  const router = useRouter();
  const run = useRun();
  const user = useQuery(api.users.getUser);
  const members = useQuery(api.accounts.organizations.listMembers, {
    organizationId: firm._id,
  });
  const setMemberRole = useMutation(api.accounts.organizations.setMemberRole);
  const removeMember = useMutation(api.accounts.organizations.removeMember);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);
  const isOwner = firm.role === "owner";
  const leaving = removing !== null && removing.userId === user?._id;

  const sorted = [...(members ?? [])].sort(
    (a, b) =>
      roles.indexOf(a.role) - roles.indexOf(b.role) ||
      (a.name ?? "").localeCompare(b.name ?? "", "ro"),
  );

  const remove = async () => {
    if (!removing) {
      return;
    }
    setBusy(true);
    const result = await run(
      () => removeMember({ organizationId: firm._id, userId: removing.userId }),
      leaving
        ? t("left", { firm: firm.name })
        : t("removed", { name: removing.name ?? removing.email ?? "" }),
    );
    setBusy(false);
    if (result.ok) {
      setRemoving(null);
      if (leaving) {
        // The firm left is gone from the switcher; another one opens.
        router.push("/estimates");
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("description", { firm: firm.name })}
          </CardDescription>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setInviting(true)}>
            <Icons.Assign aria-hidden />
            {t("invite")}
          </Button>
        )}
      </CardHeader>
      <TickRule />
      <CardContent className="pt-2">
        {members === undefined ? (
          <p className="m-0 py-2 text-body text-ink-3">{tc("loading")}</p>
        ) : (
          <ul className="m-0 grid list-none p-0">
            {sorted.map((member) => {
              const isMe = member.userId === user?._id;
              const name = member.name ?? member.email ?? "";
              // Admins remove members and admins; only owners remove owners.
              const canRemove =
                !isMe && (isOwner || (isAdmin && member.role !== "owner"));
              return (
                <li
                  key={member.userId}
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-border py-3 first:border-t-0 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                >
                  <Avatar className="size-9">
                    {member.avatarUrl && (
                      <AvatarImage src={member.avatarUrl} alt="" />
                    )}
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0">
                    <span className="truncate text-body font-medium text-ink">
                      {name}
                      {isMe && (
                        <span className="font-normal text-ink-3">
                          {" "}
                          ({t("you")})
                        </span>
                      )}
                    </span>
                    {member.email && member.email !== name && (
                      <span className="truncate text-meta text-ink-3">
                        {member.email}
                      </span>
                    )}
                  </div>
                  {/* Under the name on a phone, on its right otherwise. */}
                  <div className="col-start-2 flex items-center justify-between gap-1 sm:col-start-3 sm:justify-end">
                    {isOwner ? (
                      <Select
                        value={member.role}
                        onValueChange={(role) =>
                          run(
                            () =>
                              setMemberRole({
                                organizationId: firm._id,
                                userId: member.userId,
                                role: role as Role,
                              }),
                            t("roleChanged", { name }),
                          )
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-36"
                          aria-label={t("roleOf", { name })}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {roles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {tFirm(`roles.${role}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-body text-ink-2 sm:px-2">
                        {tFirm(`roles.${member.role}`)}
                      </span>
                    )}
                    {isMe || canRemove ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={tc("actions")}
                          >
                            <Icons.More aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-danger focus:text-danger"
                            onSelect={() => setRemoving(member)}
                          >
                            {isMe ? t("leave") : t("remove")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      // Keeps the roles lined up with the rows that have a menu.
                      <span aria-hidden className="size-9 shrink-0" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={
          leaving
            ? t("leaveTitle", { firm: firm.name })
            : t("removeTitle", {
                name: removing?.name ?? removing?.email ?? "",
              })
        }
        description={leaving ? t("leaveDescription") : t("removeDescription")}
        confirm={leaving ? t("leave") : t("remove")}
        destructive
        busy={busy}
        onConfirm={remove}
      />
      <InviteDialog open={inviting} onOpenChange={setInviting} />
    </Card>
  );
}

function InvitationsCard() {
  const t = useScopedI18n("settings.members");
  const tFirm = useScopedI18n("firm");
  const tc = useScopedI18n("common");
  const locale = useCurrentLocale();
  const { firm } = useFirm();
  const run = useRun();
  const invitations = useQuery(api.accounts.invitations.listForOrganization, {
    organizationId: firm._id,
  });
  const revoke = useMutation(api.accounts.invitations.revoke);
  if (!invitations || invitations.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader className="grid justify-stretch gap-1">
        <CardTitle>{t("invitationsTitle")}</CardTitle>
        <CardDescription>{t("invitationsDescription")}</CardDescription>
      </CardHeader>
      <TickRule />
      <CardContent className="pt-2">
        <ul className="m-0 grid list-none p-0">
          {invitations.map((invitation) => (
            <li
              key={invitation._id}
              className="grid items-center gap-x-3 gap-y-2 border-t border-border py-3 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="grid min-w-0 gap-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-body font-medium text-ink">
                    {invitation.email}
                  </span>
                  <StatusPill tone={emailTones[invitation.emailStatus]}>
                    {t(`emailStatus.${invitation.emailStatus}`)}
                  </StatusPill>
                </span>
                <span className="text-meta text-ink-3">
                  {[
                    tFirm(`roles.${invitation.role}`),
                    invitation.invitedByName &&
                      t("invitedBy", { name: invitation.invitedByName }),
                    t("expires", {
                      date: formatDay(invitation.expiresAt, locale),
                    }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 sm:justify-end">
                <CopyLinkButton token={invitation.token} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={tc("actions")}
                    >
                      <Icons.More aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-danger focus:text-danger"
                      onSelect={() =>
                        run(
                          () => revoke({ invitationId: invitation._id }),
                          t("revoked", { email: invitation.email }),
                        )
                      }
                    >
                      {t("revoke")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CopyLinkButton({
  token,
  variant = "outline",
}: {
  token: string;
  variant?: "outline" | "default";
}) {
  const t = useScopedI18n("settings.members");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink(token));
      toast.success(t("linkCopied"));
    } catch {
      // Without clipboard access, the link shows for copying by hand.
      window.prompt(t("inviteLink"), inviteLink(token));
    }
  };
  return (
    <Button type="button" size="sm" variant={variant} onClick={copy}>
      <Icons.Copy aria-hidden />
      {t("copyLink")}
    </Button>
  );
}

function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useScopedI18n("settings.members");
  const tc = useScopedI18n("common");
  const { firm } = useFirm();
  const [invited, setInvited] = useState<{
    invitationId: Id<"invitations">;
    email: string;
    token: string;
  } | null>(null);
  // Whether the email went out, once the invitation is made.
  const invitations = useQuery(
    api.accounts.invitations.listForOrganization,
    invited ? { organizationId: firm._id } : "skip",
  );
  const emailStatus = invitations?.find(
    (invitation) => invitation._id === invited?.invitationId,
  )?.emailStatus;
  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setInvited(null);
    }
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent closeLabel={tc("close")} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {invited ? t("invitedTitle") : t("inviteTitle")}
          </DialogTitle>
          <DialogDescription>
            {invited
              ? t("invitedDescription", { email: invited.email })
              : t("inviteDescription", { firm: firm.name })}
          </DialogDescription>
        </DialogHeader>
        {invited ? (
          <div className="grid gap-5">
            <Field
              label={t("inviteLink")}
              htmlFor="invite-link"
              hint={emailStatus && t(`inviteEmailHint.${emailStatus}`)}
            >
              <Input
                id="invite-link"
                readOnly
                value={inviteLink(invited.token)}
                onFocus={(event) => event.target.select()}
                className="font-mono text-code"
              />
            </Field>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => close(false)}>
                {t("done")}
              </Button>
              <CopyLinkButton token={invited.token} variant="default" />
            </div>
          </div>
        ) : (
          open && (
            <InviteForm
              onCancel={() => close(false)}
              onInvited={(invitation) => setInvited(invitation)}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}

function InviteForm({
  onCancel,
  onInvited,
}: {
  onCancel: () => void;
  onInvited: (invitation: {
    invitationId: Id<"invitations">;
    email: string;
    token: string;
  }) => void;
}) {
  const t = useScopedI18n("settings.members");
  const tFirm = useScopedI18n("firm");
  const tc = useScopedI18n("common");
  const { firm } = useFirm();
  const run = useRun();
  const create = useMutation(api.accounts.invitations.create);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitedRole>("member");
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError(t("inviteEmailInvalid"));
      document.getElementById("invite-email")?.focus();
      return;
    }
    setError(undefined);
    setSending(true);
    const result = await run(() =>
      create({ organizationId: firm._id, email: address, role }),
    );
    setSending(false);
    if (result.ok) {
      onInvited({ ...result.value, email: address });
    }
  };

  return (
    <form className="grid gap-5" onSubmit={submit} noValidate>
      <Field label={t("inviteEmail")} htmlFor="invite-email" error={error}>
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("inviteEmailPlaceholder")}
          autoComplete="off"
          aria-invalid={error !== undefined}
          autoFocus
        />
      </Field>
      <Field
        label={t("inviteRole")}
        htmlFor="invite-role"
        hint={t(`roleHints.${role}`)}
      >
        <Select
          value={role}
          onValueChange={(value) => setRole(value as InvitedRole)}
        >
          <SelectTrigger id="invite-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {invitedRoles.map((value) => (
              <SelectItem key={value} value={value}>
                {tFirm(`roles.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={sending}>
          {sending && <Icons.Loader className="animate-spin" aria-hidden />}
          {t("sendInvite")}
        </Button>
      </div>
    </form>
  );
}
