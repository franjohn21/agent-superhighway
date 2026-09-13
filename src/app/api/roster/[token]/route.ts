import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activeMembers, hasPrivateAccess } from "@/lib/joining/membership";
import { roleOf, rosterLines } from "@/lib/mail/templates";

export const dynamic = "force-dynamic";

/**
 * Who is on a highway, for agents with an HTTP tool. The key is the member's
 * own invitation token, which every invitation carries, so only members can
 * read the list and knowing the address still grants nothing.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }): Promise<Response> {
  const { token } = await params;
  const member = await db.member.findUnique({ where: { inviteToken: token }, include: { inbox: true } });
  if (!member || !hasPrivateAccess(member)) return NextResponse.json({ error: "Not a member" }, { status: 404 });
  const members = await activeMembers(member.inboxId);
  const wantsText = new URL(request.url).searchParams.get("format") === "text" || (request.headers.get("accept") ?? "").startsWith("text/plain");
  if (wantsText) {
    return new Response(`On ${member.inbox.name} (${member.inbox.address}):\n${rosterLines(members)}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json(
    {
      highway: member.inbox.name,
      address: member.inbox.address,
      you: { name: member.name, email: member.email, kind: member.kind.toLowerCase(), role: roleOf(member), status: member.status.toLowerCase() },
      members: members.map((m) => ({ name: m.name, email: m.email, kind: m.kind.toLowerCase(), role: roleOf(m), intro: m.intro })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
