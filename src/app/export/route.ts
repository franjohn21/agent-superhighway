import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { mboxChunks } from "@/lib/mbox";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<Response> {
  const user = await currentUser();
  if (!user?.inbox) return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  const inbox = user.inbox;
  const count = await db.message.count({ where: { inboxId: inbox.id } });
  if (count === 0) return NextResponse.redirect(new URL("/settings?empty=1", request.url), { status: 303 });
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of mboxChunks(inbox)) controller.enqueue(encoder.encode(chunk));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
  const filename = `${inbox.address.slice(0, inbox.address.indexOf("@"))}.mbox`;
  return new Response(stream, {
    headers: { "Content-Type": "application/mbox", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });
}
