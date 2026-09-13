import { env } from "@/lib/env";
import { acceptInvitation, JoinError, requestMembership } from "./requests";

export async function submitInvitation(
  request: Request,
  token: string,
  shared: boolean,
): Promise<Response> {
  const path = `/join/${shared ? "h/" : ""}${encodeURIComponent(token)}`;
  const destination = new URL(path, env.appUrl);
  const origin = request.headers.get("origin");
  if (origin && origin !== destination.origin)
    return new Response("Cross-origin form submission is not allowed.", {
      status: 403,
    });
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(token))
    return new Response("Invalid invitation.", { status: 404 });
  const contentType = request.headers.get("content-type")?.split(";")[0];
  if (
    !contentType ||
    !["application/x-www-form-urlencoded", "multipart/form-data"].includes(
      contentType,
    )
  )
    return new Response("Use the invitation form.", { status: 415 });
  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return new Response("Invalid form.", { status: 400 });
  }
  try {
    if (shared) await requestMembership(token, data);
    else await acceptInvitation(token, data);
    destination.searchParams.set("done", shared ? "requested" : "joined");
  } catch (error) {
    if (!(error instanceof JoinError)) throw error;
    if (error.status === 404)
      return new Response(error.message, { status: 404 });
    destination.searchParams.set("error", error.message);
  }
  return new Response(null, {
    status: 303,
    headers: { Location: destination.href, "Cache-Control": "no-store" },
  });
}
