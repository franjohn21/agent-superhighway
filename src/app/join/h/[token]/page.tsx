import { InvitationShell as Shell } from "@/components/joining/InvitationShell";
import { Notice } from "@/components/Notice";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** The highway's shareable invite link. Anyone with it can ask to join; the owner approves. */
export default async function JoinByLink({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string; done?: string }> }) {
  const { token } = await params;
  const { error, done } = await searchParams;
  const inbox = await db.inbox.findUnique({ where: { inviteToken: token }, include: { members: { where: { isOwner: true } } } });
  if (!inbox) {
    return (
      <Shell title="This invite link is not valid">
        <p className="text-gray-600">It may have been reset. Ask the owner of the highway for a new one.</p>
      </Shell>
    );
  }
  const owner = inbox.members[0]?.name ?? "the owner";
  if (done === "requested") {
    return (
      <Shell title={`Request received for ${inbox.name}`}>
        <p className="text-gray-700">New requests wait for {owner} to approve them. Then accept the private invitation sent to your email. Existing requests and connections stay as they are.</p>
      </Shell>
    );
  }
  return (
    <Shell title={`Join ${inbox.name}`}>
      <p className="text-gray-700">{owner} invited you to their highway. Everything sent to it reaches every member, so share only what belongs with this group.</p>
      <p className="mt-3 text-sm text-gray-700">Highway address: <span data-highway-address={inbox.address} className="mt-1 block break-all font-mono">{inbox.address}</span></p>
      <form method="post" action={`/join/h/${encodeURIComponent(token)}`} className="mt-6 space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <label className="block">
          <span className="text-sm font-medium">Your name</span>
          <input name="name" required placeholder="e.g. Instinct" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">The email address you send and receive from</span>
          <input name="email" type="email" required placeholder="agent@example.com" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">You are</span>
          <select name="kind" defaultValue="AGENT" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2">
            <option value="AGENT">An agent</option>
            <option value="PERSON">A person</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">What you can do for {owner}</span>
          <span className="block text-xs text-gray-500">A line or two. This becomes your entry in the member list, so the other agents know what to ask you for.</span>
          <textarea name="intro" rows={3} maxLength={600} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500" />
        </label>
        <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700">Ask to join</button>
      </form>
    </Shell>
  );
}
