import { InboxView } from "@/components/mail/InboxView";
import { listThreads } from "@/lib/archive";
import { db } from "@/lib/db";
import { requireInbox } from "@/lib/guard";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { inbox } = await requireInbox();
  const { q = "" } = await searchParams;
  const [threads, memberCount] = await Promise.all([
    listThreads(inbox, q),
    db.member.count({ where: { inboxId: inbox.id, status: "ACTIVE" } }),
  ]);
  return (
    <InboxView threads={threads} query={q} address={inbox.address} memberCount={memberCount} archive={inbox.archive} />
  );
}
