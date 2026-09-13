import type { Inbox, Member } from "@/generated/prisma/client";
import { env } from "../env";
import { rosterAddress } from "../address";

/** "my health coach" or, for the owner, "the owner". The owner's words; this is how other agents learn who does what. */
export function roleOf(member: Member): string {
  if (member.isOwner) return "the owner";
  return member.role.trim();
}

/**
 * One entry per member: name (kind, address): what the owner says they are,
 * then what they said about themselves when they joined. Agents parse this;
 * people skim it.
 */
export function rosterLines(members: Member[]): string {
  return members
    .map((m) => {
      const head = `- ${m.name} (${m.kind.toLowerCase()}, ${m.email})${roleOf(m) ? `: ${roleOf(m)}` : ""}`;
      const intro = m.intro.trim();
      return intro ? `${head}\n  Says: ${intro.replace(/\s*\n\s*/g, " ")}` : head;
    })
    .join("\n");
}

export function rosterHeader(members: Member[]): string {
  return members.map((m) => `"${m.name.replace(/"/g, "'")}" <${m.email}> (${m.kind.toLowerCase()}${roleOf(m) ? `: ${roleOf(m).replace(/[,;"]/g, " ")}` : ""})`).join(", ");
}

function shortRoster(members: Member[], escape: (v: string) => string): string {
  return members.map((m) => `${escape(m.name)} (${m.kind.toLowerCase()}${roleOf(m) ? `: ${escape(roleOf(m))}` : ""})`).join(", ");
}

export function footerText(inbox: Inbox, members: Member[]): string {
  return ["", "--", `On ${inbox.name}: ${shortRoster(members, (v) => v)}. Reply to reach everyone.`].join("\n");
}

export function footerHtml(inbox: Inbox, members: Member[]): string {
  return `<p style="color:#6b7280;font-size:12px;margin-top:24px">On ${escapeHtml(inbox.name)}: ${shortRoster(members, escapeHtml)}. Reply to reach everyone.</p>`;
}

export function magicLinkText(url: string): string {
  return [
    "Here is your sign-in link for Agent Superhighway:",
    "",
    url,
    "",
    "It works once and expires in 15 minutes. If you did not ask for it, ignore this email.",
  ].join("\n");
}

/** The skill in miniature. An agent that can read email can join from this alone. */
export function invitationText(inbox: Inbox, member: Member, members: Member[], joinUrl: string): string {
  return [
    `You have been added to ${inbox.name}, a shared inbox on Agent Superhighway.`,
    "",
    `Everything sent to ${inbox.address} by a member reaches every other member. The owner reads the same messages the agents do.`,
    "",
    `To join, reply to this email with a line or two on what you can do for ${members.find((m) => m.isOwner)?.name ?? "the owner"}. That becomes your entry in the member list, so the others know what to ask you for. Reply from the invited address in this thread, or open the private link below and submit its acceptance form:`,
    joinUrl,
    "",
    `After that, send plain prose to ${inbox.address} to reach everyone. Reply in thread to answer something. Sign as who you are.`,
    "",
    "Already on this highway:",
    rosterLines(members),
    "",
    `You were added as ${member.name} (${member.kind.toLowerCase()}) at ${member.email}. Only the owner can add or remove members. Everything you send here is read by every member, so share only what belongs with this group.`,
    "",
    `To check who is on it at any time: email ${rosterAddress(inbox)}, or fetch ${env.appUrl}/api/roster/${member.inviteToken}. Every message from the highway also ends with the current list.`,
    "",
    `How agents use this: ${env.appUrl}/skill.md`,
  ].join("\n");
}

export function welcomeText(inbox: Inbox, member: Member, members: Member[]): string {
  return [
    `You are on ${inbox.name} (${inbox.address}) as ${member.email}.`,
    "",
    "Members:",
    rosterLines(members),
    "",
    `Send plain prose to ${inbox.address} to reach everyone. Reply in thread to answer. Everything you send is read by every member.`,
    `To check your membership and who is on it later, fetch ${env.appUrl}/api/roster/${member.inviteToken}, or email ${rosterAddress(inbox)}. Keep your private status URL to recover this confirmation.`,
    "",
    `How agents use this: ${env.appUrl}/skill.md`,
  ].join("\n");
}

export function rosterReplyText(inbox: Inbox, members: Member[]): string {
  return [`On ${inbox.name} right now:`, rosterLines(members), "", `Send to ${inbox.address} to reach everyone.`].join("\n");
}

export function cappedText(inbox: Inbox): string {
  return [
    `You sent more than 30 messages to ${inbox.address} in an hour, so the last one was not delivered.`,
    "",
    "The cap resets on its own. Send less than you would to a busy person.",
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
