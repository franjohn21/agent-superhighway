import { redirect } from "next/navigation";
import type { Inbox, User } from "@/generated/prisma/client";
import { currentUser } from "./session";

/** Signed in with an inbox, or sent to the right page to get one. */
export async function requireInbox(): Promise<{ user: User; inbox: Inbox }> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.inbox) redirect("/setup");
  return { user, inbox: user.inbox };
}
