import { createVerify } from "crypto";

/** The JSON SNS posts to an HTTPS subscription (text/plain body). */
export interface SnsEnvelope {
  Type: "Notification" | "SubscriptionConfirmation" | "UnsubscribeConfirmation";
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: "1" | "2";
  Signature: string;
  SigningCertURL: string;
  Subject?: string;
  SubscribeURL?: string;
  Token?: string;
}

const ENVELOPE_TYPES = new Set<SnsEnvelope["Type"]>([
  "Notification",
  "SubscriptionConfirmation",
  "UnsubscribeConfirmation",
]);

const NOTIFICATION_SIGNED_KEYS = ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"] as const;
const SUBSCRIPTION_SIGNED_KEYS = ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"] as const;

export function parseSnsEnvelope(body: string): SnsEnvelope {
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== "object") throw new Error("SNS envelope is not an object");
  const record = parsed as Record<string, unknown>;
  for (const key of ["Type", "MessageId", "TopicArn", "Message", "Timestamp", "SignatureVersion", "Signature", "SigningCertURL"]) {
    if (typeof record[key] !== "string") throw new Error(`SNS envelope missing ${key}`);
  }
  if (!ENVELOPE_TYPES.has(record.Type as SnsEnvelope["Type"])) throw new Error(`Unknown SNS envelope type ${String(record.Type)}`);
  if (record.SignatureVersion !== "1" && record.SignatureVersion !== "2") throw new Error("Unsupported SNS signature version");
  return record as unknown as SnsEnvelope;
}

/** Only AWS's own SNS hosts may supply the signing certificate. */
export function isSnsAwsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && /^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(parsed.hostname);
  } catch {
    return false;
  }
}

function stringToSign(envelope: SnsEnvelope): string {
  const keys = envelope.Type === "Notification" ? NOTIFICATION_SIGNED_KEYS : SUBSCRIPTION_SIGNED_KEYS;
  return keys
    .filter((key) => envelope[key] !== undefined)
    .map((key) => `${key}\n${envelope[key]}\n`)
    .join("");
}

const certificateCache = new Map<string, Promise<string>>();

function fetchCertificate(url: string): Promise<string> {
  const cached = certificateCache.get(url);
  if (cached) return cached;
  const pending = fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`Fetching SNS signing certificate failed with ${response.status}`);
    return response.text();
  });
  pending.catch(() => certificateCache.delete(url));
  certificateCache.set(url, pending);
  return pending;
}

export async function verifySnsSignature(envelope: SnsEnvelope): Promise<boolean> {
  if (!isSnsAwsUrl(envelope.SigningCertURL)) return false;
  const certificate = await fetchCertificate(envelope.SigningCertURL);
  const verifier = createVerify(envelope.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1");
  verifier.update(stringToSign(envelope), "utf8");
  try {
    return verifier.verify(certificate, envelope.Signature, "base64");
  } catch {
    return false;
  }
}
