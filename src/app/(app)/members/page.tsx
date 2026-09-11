import { Connections } from "@/components/connections/Connections";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { requireInbox } from "@/lib/guard";

function weekAgo() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export default async function Members({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { inbox } = await requireInbox();
  const { error, sent } = await searchParams;
  const [members, droppedThisWeek] = await Promise.all([
    db.member.findMany({
      where: { inboxId: inbox.id, status: { not: "REMOVED" } },
      orderBy: [{ isOwner: "desc" }, { status: "asc" }, { invitedAt: "asc" }],
      select: { id: true, name: true, email: true, kind: true, role: true, intro: true, status: true, isOwner: true, inviteToken: true },
    }),
    db.droppedSender.count({ where: { inboxId: inbox.id, at: { gte: weekAgo() } } }),
  ]);
  return (
    <Connections
      members={members.map(({ inviteToken, ...member }) => ({ ...member, inviteUrl: `${env.appUrl}/join/${inviteToken}` }))}
      address={inbox.address}
      droppedThisWeek={droppedThisWeek}
      error={error}
      sent={sent}
    />
  );
}
