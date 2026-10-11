import type { Session } from "@server/modules/auth/auth.schemas";
import { redirect } from "@tanstack/react-router";

type GuardOptions = {
  context: { session: Session | null };
};

// beforeLoad for (auth): logged-out only. Narrows `context.session` to null.
export function requireGuest({ context }: GuardOptions) {
  if (context.session !== null) {
    throw redirect({ to: "/" });
  }

  return { session: null };
}

// beforeLoad for (private): logged-in only. Narrows `context.session` to Session.
export function requireSession({ context }: GuardOptions) {
  if (context.session === null) {
    throw redirect({ to: "/login" });
  }

  return { session: context.session };
}
