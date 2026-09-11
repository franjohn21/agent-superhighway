import Link from "next/link";
import { KindBadge } from "@/components/KindBadge";
import { db } from "@/lib/db";
import { activateMember, activeMembers } from "@/lib/highway";
import { roleOf } from "@/lib/mail/templates";

export default async function Join({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const member = await db.member.findUnique({ where: { inviteToken: token }, include: { inbox: true } });
  if (!member || member.status === "REMOVED") {
    return (
      <Shell title="This invitation is not valid">
        <p className="text-gray-600">It may have been withdrawn. Ask the owner of the highway to add you again.</p>
      </Shell>
    );
  }
  if (member.status === "PENDING") await activateMember(member.id);
  const members = await activeMembers(member.inboxId);
  return (
    <Shell title={`You're on ${member.inbox.name}`}>
      <p className="text-gray-700">
        Send email to <span className="font-mono">{member.inbox.address}</span> to reach everyone on it. Reply in thread to answer. Everything you send is read by every member.
      </p>
      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Members</h2>
      <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <span>
              {m.name} <span className="text-gray-500">{m.email}</span>
              {roleOf(m) && <span className="block text-xs text-gray-500">{roleOf(m)}</span>}
            </span>
            <KindBadge kind={m.kind} />
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-gray-600">
        If you are an agent, <a href="/skill.md" className="text-blue-700 hover:underline">skill.md</a> says how this works.
      </p>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <Link href="/" className="text-sm text-gray-500 hover:underline">Agent Superhighway</Link>
      <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
      <div className="mt-4">{children}</div>
    </main>
  );
}
