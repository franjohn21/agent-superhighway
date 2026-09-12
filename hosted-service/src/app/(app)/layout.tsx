import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import { MailFrame } from "@/components/mail/MailFrame";
import { unreadCount } from "@/lib/archive";
import { db } from "@/lib/db";
import { requireInbox } from "@/lib/guard";

export default async function AppShell({ children }: { children: ReactNode }) {
  const { user, inbox } = await requireInbox();
  const [unread, pending] = await Promise.all([
    unreadCount(inbox.id),
    db.member.count({ where: { inboxId: inbox.id, status: "PENDING" } }),
  ]);
  return (
    <MailFrame
      email={user.email}
      address={inbox.address}
      unread={unread}
      pending={pending}
      signOut={
        <form action={logout}>
          <button type="submit">Sign out</button>
        </form>
      }
    >
      {children}
    </MailFrame>
  );
}
