import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";
import {
  adoptUnverifiedUsers,
  CODE_SENDER,
  EmailCode,
  recordCodeSent,
} from "./emailSignIn";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, EmailCode],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { type, provider, profile, userId }) {
      const db = ctx as MutationCtx;
      // Runs in the transaction that stores a new sign-in code, before it
      // replaces the one sent last, so a request refused here leaves that one
      // working.
      if (
        type === "email" &&
        provider.id === CODE_SENDER &&
        profile.email !== undefined
      ) {
        await recordCodeSent(db, profile.email);
      }
      if (type === "oauth" && profile.email !== undefined) {
        await adoptUnverifiedUsers(db, userId, profile.email);
      }
    },
  },
});
