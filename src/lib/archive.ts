import type { Inbox, MemberKind } from "@/generated/prisma/client";
import { InboxCipher } from "./crypto";
import { db } from "./db";
import { attachmentsOf, type AttachmentMeta } from "./highway";

export interface Participant {
  name: string;
  kind: MemberKind;
}

export interface ThreadSummary {
  threadId: string;
  subject: string;
  lastAt: Date;
  count: number;
  unread: boolean;
  participants: Participant[];
  snippet: string;
  hasAttachments: boolean;
}

export interface DecryptedMessage {
  id: string;
  fromName: string;
  fromEmail: string;
  kind: MemberKind;
  isOwner: boolean;
  subject: string;
  text: string;
  html: string | null;
  attachments: AttachmentMeta[];
  deliveredTo: number;
  deliveryError: string | null;
  receivedAt: Date;
  readAt: Date | null;
}

const SNIPPET_LENGTH = 140;

function snippetOf(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > SNIPPET_LENGTH ? `${flat.slice(0, SNIPPET_LENGTH)}…` : flat;
}

/** Threads newest first. Search matches subject and sender only; bodies stay sealed. */
export async function listThreads(inbox: Inbox, query = ""): Promise<ThreadSummary[]> {
  const q = query.trim();
  const messages = await db.message.findMany({
    where: {
      inboxId: inbox.id,
      ...(q
        ? { OR: [{ subject: { contains: q, mode: "insensitive" } }, { fromName: { contains: q, mode: "insensitive" } }, { fromEmail: { contains: q, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { receivedAt: "desc" },
    select: { threadId: true, subject: true, receivedAt: true, readAt: true, text: true, attachments: true, member: { select: { name: true, kind: true } } },
  });
  const cipher = new InboxCipher(inbox.dataKey);
  const threads = new Map<string, ThreadSummary>();
  for (const message of messages) {
    const existing = threads.get(message.threadId);
    if (existing) {
      existing.count += 1;
      existing.unread ||= message.readAt === null;
      existing.hasAttachments ||= attachmentsOf(message.attachments).length > 0;
      if (!existing.participants.some((p) => p.name === message.member.name)) existing.participants.push({ name: message.member.name, kind: message.member.kind });
    } else {
      threads.set(message.threadId, {
        threadId: message.threadId,
        subject: message.subject,
        lastAt: message.receivedAt,
        count: 1,
        unread: message.readAt === null,
        participants: [{ name: message.member.name, kind: message.member.kind }],
        snippet: snippetOf(cipher.decrypt(message.text)),
        hasAttachments: attachmentsOf(message.attachments).length > 0,
      });
    }
  }
  return Array.from(threads.values());
}

export async function getThread(inbox: Inbox, threadId: string): Promise<DecryptedMessage[]> {
  const messages = await db.message.findMany({
    where: { inboxId: inbox.id, threadId },
    orderBy: { receivedAt: "asc" },
    include: { member: { select: { kind: true, isOwner: true } } },
  });
  const cipher = new InboxCipher(inbox.dataKey);
  return messages.map((m) => ({
    id: m.id,
    fromName: m.fromName,
    fromEmail: m.fromEmail,
    kind: m.member.kind,
    isOwner: m.member.isOwner,
    subject: m.subject,
    text: cipher.decrypt(m.text),
    html: m.html ? cipher.decrypt(m.html) : null,
    attachments: attachmentsOf(m.attachments),
    deliveredTo: m.deliveredTo,
    deliveryError: m.deliveryError,
    receivedAt: m.receivedAt,
    readAt: m.readAt,
  }));
}

export async function markThreadRead(inboxId: string, threadId: string): Promise<void> {
  await db.message.updateMany({ where: { inboxId, threadId, readAt: null }, data: { readAt: new Date() } });
}

export async function unreadCount(inboxId: string): Promise<number> {
  return db.message.count({ where: { inboxId, readAt: null } });
}

/** The original RFC 822 bytes of one message, for attachments and export. */
export async function rawMessage(inbox: Inbox, messageId: string): Promise<Buffer | null> {
  const message = await db.message.findFirst({ where: { id: messageId, inboxId: inbox.id }, select: { raw: true } });
  if (!message) return null;
  return new InboxCipher(inbox.dataKey).decryptBuffer(message.raw);
}
