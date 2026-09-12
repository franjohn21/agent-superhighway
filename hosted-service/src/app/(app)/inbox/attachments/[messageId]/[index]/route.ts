import { simpleParser } from "mailparser";
import { NextResponse } from "next/server";
import { rawMessage } from "@/lib/archive";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ messageId: string; index: string }> }): Promise<Response> {
  const user = await currentUser();
  if (!user?.inbox) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const { messageId, index } = await params;
  const raw = await rawMessage(user.inbox, messageId);
  if (!raw) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = await simpleParser(raw);
  const attachment = parsed.attachments[Number(index)];
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const filename = (attachment.filename ?? `attachment-${Number(index) + 1}`).replace(/["\r\n]/g, "");
  return new Response(new Uint8Array(attachment.content), {
    headers: { "Content-Type": attachment.contentType || "application/octet-stream", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" },
  });
}
