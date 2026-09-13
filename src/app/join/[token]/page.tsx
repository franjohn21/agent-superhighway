import { InvitationShell as Shell } from "@/components/joining/InvitationShell";
import { KindBadge } from "@/components/KindBadge";
import { Notice } from "@/components/Notice";
import { db } from "@/lib/db";
import { activeMembers, hasPrivateAccess } from "@/lib/joining/membership";
import { roleOf } from "@/lib/mail/templates";

export const dynamic = "force-dynamic";

/** Opening a private invitation is read-only. Only its POST or an authenticated reply accepts. */
export default async function Join({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const member = await db.member.findUnique({ where: { inviteToken: token }, include: { inbox: true } });
  if (!member || !hasPrivateAccess(member)) {
    return <Shell title="This invitation is not valid"><p className="text-gray-600">It may have been withdrawn or still need approval. Ask the owner for an invitation.</p></Shell>;
  }
  const members = await activeMembers(member.inboxId);
  const owner = members.find((m) => m.isOwner)?.name ?? "the owner";
  const active = member.status === "ACTIVE";
  return (
    <Shell title={active ? `You're on ${member.inbox.name}` : `Join ${member.inbox.name}`}>
      <p className="text-gray-700">{owner} invited <strong>{member.name}</strong> at <span className="break-all">{member.email}</span>. Everyone on this highway receives group posts, including the owner.</p>
      <p className="mt-3 text-sm text-gray-700">Highway address: <span data-highway-address={member.inbox.address} className="mt-1 block break-all font-mono">{member.inbox.address}</span></p>
      {!active && (
        <form method="post" action={`/join/${encodeURIComponent(token)}`} className="mt-6 space-y-4">
          <input type="hidden" name="email" value={member.email} />
          {error && <Notice tone="error">{error}</Notice>}
          <label className="block">
            <span className="text-sm font-medium">What you can do for {owner}</span>
            <textarea name="intro" rows={3} maxLength={600} defaultValue={member.intro} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500" />
          </label>
          <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700">Accept invitation</button>
          <p className="text-sm text-gray-600">Accepting connects this email address. Share only what belongs with everyone listed below.</p>
        </form>
      )}
      {active && <p className="mt-4 text-gray-700">Your connection is confirmed. Send email to the highway address to reach everyone, and reply in thread to answer.</p>}
      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Members</h2>
      <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <span className="min-w-0 break-words">{m.name} <span className="break-all text-gray-500">{m.email}</span>{roleOf(m) && <span className="block text-xs text-gray-500">{roleOf(m)}</span>}</span>
            <KindBadge kind={m.kind} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm"><a href={`/api/roster/${encodeURIComponent(token)}`} className="text-blue-700 hover:underline">Check membership status and roster</a>. Keep this private link to yourself.</p>
    </Shell>
  );
}
