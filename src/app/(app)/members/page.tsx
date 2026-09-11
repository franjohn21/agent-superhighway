import { addMember, removeMemberAction, resendInvitation } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { CopyButton } from "@/components/CopyButton";
import { KindBadge } from "@/components/KindBadge";
import { Notice } from "@/components/Notice";
import { When } from "@/components/When";
import { db } from "@/lib/db";
import { requireInbox } from "@/lib/guard";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default async function Members({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const { inbox } = await requireInbox();
  const { error, sent } = await searchParams;
  const [members, droppedThisWeek] = await Promise.all([
    db.member.findMany({ where: { inboxId: inbox.id, status: { not: "REMOVED" } }, orderBy: [{ isOwner: "desc" }, { status: "asc" }, { invitedAt: "asc" }] }),
    db.droppedSender.count({ where: { inboxId: inbox.id, at: { gte: new Date(Date.now() - WEEK) } } }),
  ]);
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-gray-100 px-4 py-3">
        <h1 className="text-lg font-medium">Members</h1>
        <p className="mt-1 text-sm text-gray-600">Everyone here receives everything sent here. What each agent shares is up to that agent.</p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500">Highway address</span>
          <span className="font-mono">{inbox.address}</span>
          <CopyButton value={inbox.address} />
        </p>
      </div>
      <div className="space-y-4 p-4">
        {error && <Notice tone="error">{error}</Notice>}
        {sent && <Notice tone="ok">Invitation sent again.</Notice>}
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={m.name} kind={m.kind} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{m.name}</span>
                  <KindBadge kind={m.kind} />
                  {m.isOwner && <span className="text-xs text-gray-500">you</span>}
                </div>
                <div className="truncate text-sm text-gray-600">{m.email}</div>
              </div>
              <div className="text-xs text-gray-500">
                {m.status === "ACTIVE" ? (
                  <span>joined {m.joinedAt ? <When date={m.joinedAt} /> : ""}</span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">waiting for a reply</span>
                )}
              </div>
              {!m.isOwner && (
                <div className="flex items-center gap-2">
                  {m.status === "PENDING" && (
                    <form action={resendInvitation}>
                      <input type="hidden" name="memberId" value={m.id} />
                      <button type="submit" className="rounded-full border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100">Resend invite</button>
                    </form>
                  )}
                  <form action={removeMemberAction}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <button type="submit" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50">Remove</button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
        <form action={addMember} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="font-medium">Add a member</h2>
          <p className="mt-1 text-sm text-gray-600">They get an invitation bound to this address. Any reply from it joins them; a forwarded invitation cannot join anyone else.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <input name="name" required placeholder="Name, e.g. BodyBuddy" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <input name="email" type="email" required placeholder="Email address" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <select name="kind" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="AGENT">Agent</option>
              <option value="PERSON">Person</option>
            </select>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Invite</button>
          </div>
        </form>
        <p className="text-xs text-gray-500">
          {droppedThisWeek === 0 ? "No mail from non-members was dropped this week." : `${droppedThisWeek} ${droppedThisWeek === 1 ? "message" : "messages"} from non-members or unauthenticated senders dropped this week. Nothing else is kept about them.`}
        </p>
      </div>
    </div>
  );
}
