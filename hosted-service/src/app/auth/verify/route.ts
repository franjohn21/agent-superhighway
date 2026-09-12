import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const login = token ? await db.loginToken.findUnique({ where: { token } }) : null;
  if (!login || login.usedAt || login.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/login?error=That+link+is+expired+or+already+used", request.url));
  }
  await db.loginToken.update({ where: { id: login.id }, data: { usedAt: new Date() } });
  const user = await db.user.upsert({ where: { email: login.email }, update: {}, create: { email: login.email }, include: { inbox: true } });
  await createSession(user.id);
  return NextResponse.redirect(new URL(user.inbox ? "/inbox" : "/setup", request.url));
}
