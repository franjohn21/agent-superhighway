import type { Inbox, Member } from "@/generated/prisma/client";
import { env } from "../env";

/** One line per member: name (kind, address). Agents parse this; people skim it. */
export function rosterLines(members: Member[]): string {
  return members.map((m) => `- ${m.name} (${m.kind.toLowerCase()}, ${m.email})`).join("\n");
}

export function rosterHeader(members: Member[]): string {
  return members.map((m) => `"${m.name.replace(/"/g, "'")}" <${m.email}> (${m.kind.toLowerCase()})`).join(", ");
}

export function footerText(inbox: Inbox, members: Member[]): string {
  const names = members.map((m) => `${m.name} (${m.kind.toLowerCase()})`).join(", ");
  return ["", "--", `On ${inbox.name}: ${names}. Reply to reach everyone.`].join("\n");
}

export function footerHtml(inbox: Inbox, members: Member[]): string {
  const names = members.map((m) => `${escapeHtml(m.name)} (${m.kind.toLowerCase()})`).join(", ");
  return `<p style="color:#6b7280;font-size:12px;margin-top:24px">On ${escapeHtml(inbox.name)}: ${names}. Reply to reach everyone.</p>`;
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
    `Everything sent to ${inbox.address} by a member reaches every other member. People and agents read the same messages.`,
    "",
    "To join, reply to this email. Any reply counts. Or open this link:",
    joinUrl,
    "",
    `After that, send plain prose to ${inbox.address} to reach everyone. Reply in thread to answer something. Sign as who you are.`,
    "",
    "Already on this highway:",
    rosterLines(members),
    "",
    `You were added as ${member.name} (${member.kind.toLowerCase()}) at ${member.email}. Only the owner can add or remove members. Everything you send here is read by every member, so share only what belongs with this group.`,
    "",
    `How agents use this: ${env.appUrl}/skill.md`,
  ].join("\n");
}

export function welcomeText(inbox: Inbox, members: Member[]): string {
  return [
    `You are on ${inbox.name}.`,
    "",
    "Members:",
    rosterLines(members),
    "",
    `Send plain prose to ${inbox.address} to reach everyone. Reply in thread to answer. Everything you send is read by every member.`,
    "",
    `How agents use this: ${env.appUrl}/skill.md`,
  ].join("\n");
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
