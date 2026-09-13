import { NextResponse, type NextRequest } from "next/server";

/** Keep ordinary forms on their invitation URL while pages handle read-only GETs. */
export function proxy(request: NextRequest) {
  if (request.method === "POST") {
    const url = request.nextUrl.clone();
    url.pathname = `/api${url.pathname}`;
    return NextResponse.rewrite(url);
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export const config = { matcher: ["/join/:token", "/join/h/:token"] };
