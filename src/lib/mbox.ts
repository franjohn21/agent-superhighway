import type { Inbox } from "@/generated/prisma/client";
import { InboxCipher } from "./crypto";
import { db } from "./db";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function asctime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${DAYS[date.getUTCDay()]} ${MONTHS[date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, " ")} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} ${date.getUTCFullYear()}`;
}

/** The whole archive as mboxrd, oldest first. Streams so a big inbox never sits in memory. */
export async function* mboxChunks(inbox: Inbox): AsyncGenerator<string> {
  const cipher = new InboxCipher(inbox.dataKey);
  const messages = await db.message.findMany({
    where: { inboxId: inbox.id },
    orderBy: { receivedAt: "asc" },
    select: { id: true, fromEmail: true, receivedAt: true },
  });
  for (const summary of messages) {
    const message = await db.message.findUnique({ where: { id: summary.id }, select: { raw: true } });
    if (!message) continue;
    const raw = cipher.decryptBuffer(message.raw).toString("utf8").replace(/\r\n/g, "\n").replace(/^(>*From )/gm, ">$1");
    yield `From ${summary.fromEmail} ${asctime(summary.receivedAt)}\n${raw.replace(/\n*$/, "")}\n\n`;
  }
}
