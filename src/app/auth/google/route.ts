import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { googleAuthUrl, isGoogleConfigured } from "@/lib/google";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isGoogleConfigured()) return NextResponse.redirect(new URL("/login?error=Google+sign-in+is+not+set+up", request.url));
  const state = randomBytes(16).toString("base64url");
  const jar = await cookies();
  jar.set("sh_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/auth/google", maxAge: 600 });
  return NextResponse.redirect(googleAuthUrl(state));
}
