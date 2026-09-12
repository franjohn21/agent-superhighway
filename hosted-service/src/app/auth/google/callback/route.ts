import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { normalizeEmail } from "@/lib/address";
import { db } from "@/lib/db";
import { emailFromCode } from "@/lib/google";
import { createSession } from "@/lib/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const jar = await cookies();
  const expectedState = jar.get("sh_oauth_state")?.value;
  jar.delete({ name: "sh_oauth_state", path: "/auth/google" });
  const code = params.get("code");
  if (!code || !expectedState || params.get("state") !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=Google+sign-in+did+not+complete", request.url));
  }
  const email = await emailFromCode(code);
  if (!email) return NextResponse.redirect(new URL("/login?error=Google+did+not+confirm+an+email+address", request.url));
  const user = await db.user.upsert({ where: { email: normalizeEmail(email) }, update: {}, create: { email: normalizeEmail(email) }, include: { inbox: true } });
  await createSession(user.id);
  return NextResponse.redirect(new URL(user.inbox ? "/inbox" : "/setup", request.url));
}
