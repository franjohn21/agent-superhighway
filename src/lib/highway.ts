import { randomUUID } from "crypto";
import { activeMembers, activateMember, highwayFrom, hasPrivateAccess, systemHeaders } from "./joining/membership";
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { simpleParser, type ParsedMail } from "mailparser";
import type Mail from "nodemailer/lib/mailer";
import type { Inbox, Member } from "@/generated/prisma/client";
import { domainOf, normalizeEmail } from "./address";
import { InboxCipher } from "./crypto";
import { db } from "./db";
import { env } from "./env";
import { isAuthenticated, isSpamOrVirus } from "./mail/authentication";
import { extractIntro } from "./mail/intro";
import { messageIdKey, referencedKeys, sesMessageIdHeader, subjectKey } from "./mail/message-ids";
import { buildRaw, sendPlain, sendRaw } from "./mail/send";
import type { SesReceiptNotification } from "./mail/ses-notification";
import * as templates from "./mail/templates";

export { rosterAddress } from "./address";
export { activeMembers, activateMember, sendInvitation, removeMember } from "./joining/membership";

const HOURLY_CAP = 30;
const HOUR = 60 * 60 * 1000;
const SUBJECT_THREAD_WINDOW = 14 * 24 * HOUR;

export type ReceiveOutcome =
  | "no_inbox"
  | "loop"
  | "auto_reply"
  | "not_member"
  | "spam"
  | "auth_failed"
  | "removed"
  | "not_approved"
  | "not_invitation"
  | "activated"
  | "capped"
  | "roster"
  | "delivered";

export type AttachmentMeta = {
  index: number;
  filename: string;
  contentType: string;
  size: number;
};

export function attachmentsOf(json: unknown): AttachmentMeta[] {
  return Array.isArray(json) ? (json as AttachmentMeta[]) : [];
}

// Inbound -----------------------------------------------------------------

let s3Client: S3Client | null = null;
function s3(): S3Client {
  if (!s3Client) s3Client = new S3Client({ region: env.inboundBucketRegion, credentials: env.awsCredentials });
  return s3Client;
}

async function fetchRaw(action: SesReceiptNotification["receipt"]["action"]): Promise<Buffer> {
  const object = await s3().send(new GetObjectCommand({ Bucket: action.bucketName, Key: action.objectKey }));
  if (!object.Body) throw new Error("Inbound object had no body");
  return Buffer.from(await object.Body.transformToByteArray());
}

async function deleteRaw(action: SesReceiptNotification["receipt"]["action"]): Promise<void> {
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: action.bucketName, Key: action.objectKey }));
  } catch (error) {
    console.warn("Could not delete inbound object", action.objectKey, error);
  }
}

function headerValues(parsed: ParsedMail, name: string): string[] {
  const value = parsed.headers.get(name);
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  return [typeof value === "string" ? value : String((value as { value?: unknown }).value ?? value)];
}

/**
 * The whole inbound path: find the inbox, prove the sender, check membership,
 * then archive and redeliver. Anything that fails is never delivered.
 */
export async function receiveInbound(notification: SesReceiptNotification): Promise<ReceiveOutcome> {
  const recipient = notification.receipt.recipients.map(normalizeEmail).find((r) => domainOf(r) === env.mailDomain);
  const target = recipient ? parseRecipient(recipient) : null;
  const inbox = target ? await db.inbox.findUnique({ where: { address: target.address }, include: { members: true } }) : null;
  if (!inbox || !target) return "no_inbox";

  const raw = await fetchRaw(notification.receipt.action);
  try {
    const parsed = await simpleParser(raw);
    const fromEmail = normalizeEmail(parsed.from?.value[0]?.address ?? notification.mail.source);
    if (fromEmail === inbox.address) return "loop";
    const autoSubmitted = headerValues(parsed, "auto-submitted")[0]?.toLowerCase();
    if (autoSubmitted && autoSubmitted !== "no") return "auto_reply";

    const member = inbox.members.find((m) => m.email === fromEmail);
    if (!member) return drop(inbox, fromEmail, "not_member");
    if (isSpamOrVirus(notification.receipt)) return drop(inbox, fromEmail, "spam");
    if (!isAuthenticated(headerValues(parsed, "authentication-results"), domainOf(fromEmail), notification.receipt)) {
      return drop(inbox, fromEmail, "auth_failed");
    }
    if (member.status === "REMOVED") return drop(inbox, fromEmail, "removed");
    if (!hasPrivateAccess(member)) return drop(inbox, fromEmail, "not_approved");
    if (target.command === "roster") {
      await replyWithRoster(inbox, member);
      return "roster";
    }
    const invitationReply = referencedKeys(parsed.inReplyTo, parsed.references).some((key) => member.invitationMessageIds.includes(key));
    if (member.status === "PENDING" || invitationReply) {
      if (!invitationReply) return drop(inbox, fromEmail, "not_invitation");
      return await activateMember(member.id, member.inviteToken, extractIntro(plainText(parsed)))
        ? "activated" : "removed";
    }
    if (await overHourlyCap(inbox, member)) return "capped";

    await deliver(inbox, member, parsed, raw);
    return "delivered";
  } finally {
    await deleteRaw(notification.receipt.action);
  }
}

async function drop(inbox: Inbox, email: string, reason: Exclude<ReceiveOutcome, "delivered" | "activated" | "no_inbox" | "loop" | "auto_reply" | "capped">): Promise<ReceiveOutcome> {
  await db.droppedSender.create({ data: { inboxId: inbox.id, email, reason } });
  return reason;
}

async function overHourlyCap(inbox: Inbox, member: Member): Promise<boolean> {
  const now = new Date();
  if (!member.hourWindowStart || now.getTime() - member.hourWindowStart.getTime() > HOUR) {
    await db.member.update({ where: { id: member.id }, data: { hourWindowStart: now, hourCount: 1 } });
    return false;
  }
  if (member.hourCount >= HOURLY_CAP) {
    if (!member.cappedNotifiedAt || now.getTime() - member.cappedNotifiedAt.getTime() > HOUR) {
      await db.member.update({ where: { id: member.id }, data: { cappedNotifiedAt: now } });
      await sendPlain({ from: highwayFrom(inbox), to: member.email, subject: `Paused on ${inbox.name}`, text: templates.cappedText(inbox), headers: systemHeaders("paused") }).catch(() => undefined);
    }
    return true;
  }
  await db.member.update({ where: { id: member.id }, data: { hourCount: { increment: 1 } } });
  return false;
}

const COMMAND_TAGS: Record<string, "roster"> = { roster: "roster", members: "roster", who: "roster" };

/** francis-k7m2p9+roster@domain -> the inbox address plus the command in the tag. */
function parseRecipient(recipient: string): { address: string; command: "roster" | null } {
  const at = recipient.indexOf("@");
  const local = recipient.slice(0, at);
  const plus = local.indexOf("+");
  if (plus === -1) return { address: recipient, command: null };
  const tag = local.slice(plus + 1);
  return { address: `${local.slice(0, plus)}${recipient.slice(at)}`, command: COMMAND_TAGS[tag] ?? null };
}

/** Any member can ask who is listening by emailing the +roster address. The answer goes to them alone. */
async function replyWithRoster(inbox: Inbox, member: Member): Promise<void> {
  const members = await activeMembers(inbox.id);
  await sendPlain({
    from: highwayFrom(inbox),
    to: member.email,
    replyTo: inbox.address,
    subject: `Who is on ${inbox.name}`,
    text: templates.rosterReplyText(inbox, members),
    headers: systemHeaders("roster", members),
  });
}

// Delivery ------------------------------------------------------------------

async function resolveThreadId(inboxId: string, keys: string[], subject: string): Promise<string | null> {
  if (keys.length > 0) {
    const cited = await db.message.findFirst({
      where: { inboxId, OR: [{ messageIdKey: { in: keys } }, { sesMessageIds: { hasSome: keys } }] },
      select: { threadId: true },
    });
    if (cited) return cited.threadId;
  }
  const key = subjectKey(subject);
  if (key) {
    const sameSubject = await db.message.findFirst({
      where: { inboxId, subjectKey: key, receivedAt: { gte: new Date(Date.now() - SUBJECT_THREAD_WINDOW) } },
      orderBy: { receivedAt: "desc" },
      select: { threadId: true },
    });
    if (sameSubject) return sameSubject.threadId;
  }
  return null;
}

/**
 * Every recipient got its own SES copy with its own Message-ID, so a reply
 * cites an id the other recipients never saw. Expanding References with every
 * known id for the cited messages lets each recipient's client find its copy.
 */
async function expandReferences(inboxId: string, cited: string[], keys: string[]): Promise<string[]> {
  if (keys.length === 0) return cited;
  const known = await db.message.findMany({
    where: { inboxId, OR: [{ messageIdKey: { in: keys } }, { sesMessageIds: { hasSome: keys } }] },
    select: { messageId: true, sesMessageIds: true },
  });
  const all = [...cited];
  for (const message of known) {
    all.push(message.messageId, ...message.sesMessageIds.map((id) => sesMessageIdHeader(id, env.sesRegion)));
  }
  return Array.from(new Set(all));
}

function plainText(parsed: ParsedMail): string {
  if (parsed.text) return parsed.text;
  if (parsed.html) return parsed.html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return "";
}

function withHtmlFooter(html: string, footer: string): string {
  const close = html.search(/<\/body>/i);
  return close === -1 ? html + footer : html.slice(0, close) + footer + html.slice(close);
}

function citedIds(parsed: ParsedMail): string[] {
  const ids: string[] = [];
  if (parsed.inReplyTo) ids.push(parsed.inReplyTo);
  if (Array.isArray(parsed.references)) ids.push(...parsed.references);
  else if (parsed.references) ids.push(...parsed.references.split(/\s+/));
  return ids.filter(Boolean);
}

/** Archives the message (when the inbox keeps an archive) and redelivers it to every other active member. */
async function deliver(inbox: Inbox, sender: Member, parsed: ParsedMail, raw: Buffer): Promise<string> {
  const members = await activeMembers(inbox.id);
  const recipients = members.filter((m) => m.id !== sender.id);
  const subject = parsed.subject ?? "(no subject)";
  const messageId = parsed.messageId ?? `<${randomUUID()}@${env.mailDomain}>`;
  const keys = referencedKeys(parsed.inReplyTo, parsed.references);
  const id = randomUUID();
  const threadId = (await resolveThreadId(inbox.id, keys, subject)) ?? id;
  const references = await expandReferences(inbox.id, citedIds(parsed), keys);
  const text = plainText(parsed);
  const localPart = inbox.address.slice(0, inbox.address.indexOf("@"));

  const outbound: Mail.Options = {
    from: { name: `${sender.name} (via ${inbox.name})`, address: inbox.address },
    to: { name: inbox.name, address: inbox.address },
    replyTo: inbox.address,
    subject,
    text: text + templates.footerText(inbox, members),
    html: parsed.html ? withHtmlFooter(parsed.html, templates.footerHtml(inbox, members)) : undefined,
    attachments: parsed.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
      cid: a.cid,
      contentDisposition: a.contentDisposition === "inline" ? "inline" : "attachment",
    })),
    inReplyTo: parsed.inReplyTo,
    references: references.length > 0 ? references.join(" ") : undefined,
    headers: {
      "List-Id": `${inbox.name.replace(/[^\w .'-]/g, "")} <${localPart}.${env.mailDomain}>`,
      "List-Post": `<mailto:${inbox.address}>`,
      Precedence: "list",
      "X-Superhighway-From": `"${sender.name.replace(/"/g, "'")}" <${sender.email}>`,
      "X-Superhighway-Kind": sender.kind.toLowerCase(),
      "X-Superhighway-Members": templates.rosterHeader(members),
    },
  };
  const outboundRaw = await buildRaw(outbound);

  const sesMessageIds: string[] = [];
  const failures: string[] = [];
  for (const recipient of recipients) {
    try {
      sesMessageIds.push((await sendRaw(outboundRaw, highwayFrom(inbox), recipient.email)).toLowerCase());
    } catch (error) {
      failures.push(`${recipient.email}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (inbox.archive) {
    const cipher = new InboxCipher(inbox.dataKey);
    const attachments: AttachmentMeta[] = parsed.attachments.map((a, index) => ({
      index,
      filename: a.filename ?? `attachment-${index + 1}`,
      contentType: a.contentType,
      size: a.size,
    }));
    await db.message.create({
      data: {
        id,
        inboxId: inbox.id,
        memberId: sender.id,
        threadId,
        messageId,
        messageIdKey: messageIdKey(messageId),
        sesMessageIds,
        subject,
        subjectKey: subjectKey(subject),
        fromEmail: sender.email,
        fromName: sender.name,
        text: cipher.encrypt(text),
        html: parsed.html ? cipher.encrypt(parsed.html) : null,
        raw: cipher.encrypt(raw),
        attachments,
        deliveredTo: sesMessageIds.length,
        deliveryError: failures.length > 0 ? failures.join("\n") : null,
        readAt: sender.isOwner ? new Date() : null,
        receivedAt: parsed.date ?? new Date(),
      },
    });
  }
  return threadId;
}

/** A message the owner wrote on the web. Built as real email so the archive and export stay uniform. */
export async function postFromOwner(inbox: Inbox, owner: Member, input: { subject: string; text: string; threadId?: string }): Promise<string> {
  const last = input.threadId
    ? await db.message.findFirst({ where: { inboxId: inbox.id, threadId: input.threadId }, orderBy: { receivedAt: "desc" } })
    : null;
  const subject = last ? (subjectKey(last.subject) === subjectKey(input.subject) || !input.subject ? (/^re:/i.test(last.subject) ? last.subject : `Re: ${last.subject}`) : input.subject) : input.subject;
  const references = last ? [last.messageId, ...last.sesMessageIds.map((id) => sesMessageIdHeader(id, env.sesRegion))] : [];
  const raw = await buildRaw({
    from: { name: owner.name, address: owner.email },
    to: { name: inbox.name, address: inbox.address },
    subject: subject || "(no subject)",
    text: input.text,
    messageId: `<${randomUUID()}@${env.mailDomain}>`,
    inReplyTo: last?.messageId,
    references: references.length > 0 ? references.join(" ") : undefined,
    date: new Date(),
  });
  const parsed = await simpleParser(raw);
  return deliver(inbox, owner, parsed, raw);
}
