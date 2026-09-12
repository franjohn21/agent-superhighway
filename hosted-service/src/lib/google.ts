import { env } from "./env";

/**
 * Sign in with Google, authorization-code flow, no library. Only the verified
 * email is used; it becomes the same account a magic link to that address would.
 * Optional: the button appears only when both settings are present.
 */
export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function clientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("Missing environment variable GOOGLE_CLIENT_ID");
  return id;
}

function clientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("Missing environment variable GOOGLE_CLIENT_SECRET");
  return secret;
}

export function redirectUri(): string {
  return `${env.appUrl}/auth/google/callback`;
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

interface IdTokenClaims {
  aud?: string;
  email?: string;
  email_verified?: boolean;
}

/** Exchanges the code and returns the verified email, or null if Google would not vouch for one. */
export async function emailFromCode(code: string): Promise<string | null> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId(), client_secret: clientSecret(), redirect_uri: redirectUri(), grant_type: "authorization_code" }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { id_token?: string };
  if (!body.id_token) return null;
  // The token came straight from Google's token endpoint over TLS, so decoding without a signature check is sound here.
  const payload = body.id_token.split(".")[1];
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as IdTokenClaims;
  if (claims.aud !== clientId() || !claims.email || claims.email_verified !== true) return null;
  return claims.email;
}
