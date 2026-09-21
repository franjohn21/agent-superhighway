import { randomBytes } from "crypto";
import type { Inbox, Member } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendPlain } from "@/lib/mail/send";
import { messageIdKey } from "@/lib/mail/message-ids";
import * as templates from "@/lib/mail/templates";

export function hasPrivateAccess(
  member: Pick<Member, "status" | "requestedViaLink">,
): boolean {
  return (
    member.status === "ACTIVE" ||
    (member.status === "PENDING" && !member.requestedViaLink)
  );
}

export function activeMembers(inboxId: string): Promise<Member[]> {
  return db.member.findMany({
    where: { inboxId, status: "ACTIVE" },
    orderBy: [{ isOwner: "desc" }, { joinedAt: "asc" }],
  });
}

export function highwayFrom(inbox: Inbox): string {
  return `"${inbox.name.replace(/"/g, "'")}" <${inbox.address}>`;
}

export function systemHeaders(
  event: "invitation" | "joined" | "roster" | "paused",
  members?: Member[],
): Record<string, string> {
  return {
    "X-Superhighway-Kind": "highway",
    "X-Superhighway-Event": event,
    ...(members
      ? { "X-Superhighway-Members": templates.rosterHeader(members) }
      : {}),
  };
}

/** Only owner-approved invitations disclose the private link and roster. */
export async function sendInvitation(
  inbox: Inbox,
  member: Member,
): Promise<void> {
  if (member.status !== "PENDING" || member.requestedViaLink) return;
  const members = await activeMembers(inbox.id);
  const id = await sendPlain({
    from: highwayFrom(inbox),
    to: member.email,
    replyTo: inbox.address,
    subject: `You're invited to ${inbox.name}`,
    text: templates.invitationText(
      inbox,
      member,
      members,
      `${env.appUrl}/join/${member.inviteToken}`,
    ),
    headers: systemHeaders("invitation", members),
  });
  // SES supplies the Message-ID. Bind replies to this invitation generation,
  // so an old reply cannot accept an address after removal and re-invitation.
  await db.member.updateMany({
    where: {
      id: member.id,
      inviteToken: member.inviteToken,
      status: "PENDING",
      requestedViaLink: false,
    },
    data: { invitationMessageIds: { push: messageIdKey(id) } },
  });
}

/** Approval sends an invitation; acceptance is a separate step. Retries preserve its token. */
export async function approveJoinRequest(
  inbox: Inbox,
  memberId: string,
): Promise<void> {
  await db.member.updateMany({
    where: {
      id: memberId,
      inboxId: inbox.id,
      status: "PENDING",
      requestedViaLink: true,
    },
    data: {
      requestedViaLink: false,
      inviteToken: randomBytes(24).toString("base64url"),
      invitationMessageIds: [],
      invitedAt: new Date(),
    },
  });
  const member = await db.member.findFirst({
    where: {
      id: memberId,
      inboxId: inbox.id,
      status: "PENDING",
      requestedViaLink: false,
    },
  });
  if (member && member.invitationMessageIds.length === 0)
    await sendInvitation(inbox, member);
}

/** Accept only the currently approved invitation. Duplicate acceptances are silent. */
export async function activateMember(
  memberId: string,
  inviteToken: string,
  intro = "",
): Promise<boolean> {
  const changed = await db.member.updateMany({
    where: {
      id: memberId,
      inviteToken,
      status: "PENDING",
      requestedViaLink: false,
    },
    data: {
      status: "ACTIVE",
      joinedAt: new Date(),
      ...(intro.trim() ? { intro: intro.trim().slice(0, 600) } : {}),
    },
  });
  const member = await db.member.findFirst({
    where: { id: memberId, inviteToken, status: "ACTIVE" },
    include: { inbox: true },
  });
  if (!member) return false;
  if (!changed.count) return true;
  const members = await activeMembers(member.inboxId);
  await sendPlain({
    from: highwayFrom(member.inbox),
    to: member.email,
    replyTo: member.inbox.address,
    subject: `You're on ${member.inbox.name}`,
    text: templates.welcomeText(member.inbox, member, members),
    headers: systemHeaders("joined", members),
  }).catch(() =>
    console.warn("Highway confirmation delivery failed", { memberId }),
  );
  // The private status URL recovers confirmation if the email is lost.
  return true;
}

export async function removeMember(memberId: string): Promise<void> {
  await db.member.updateMany({
    where: { id: memberId, isOwner: false },
    data: {
      status: "REMOVED",
      inviteToken: randomBytes(24).toString("base64url"),
      invitationMessageIds: [],
    },
  });
}
