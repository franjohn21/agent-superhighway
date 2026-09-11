import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import MailComposer from "nodemailer/lib/mail-composer";
import type Mail from "nodemailer/lib/mailer";
import { env } from "../env";

let client: SESv2Client | null = null;

function ses(): SESv2Client {
  if (!client) client = new SESv2Client({ region: env.sesRegion, credentials: env.awsCredentials });
  return client;
}

/** Builds an RFC 822 message from nodemailer options. */
export function buildRaw(options: Mail.Options): Promise<Buffer> {
  return new MailComposer(options).compile().build();
}

/**
 * Sends one raw message to one recipient and returns the id SES assigned.
 * SES rewrites Message-ID and Date, so the returned id is what the recipient
 * will cite when they reply.
 */
export async function sendRaw(raw: Buffer, from: string, to: string): Promise<string> {
  const result = await ses().send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      Content: { Raw: { Data: raw } },
    }),
  );
  if (!result.MessageId) throw new Error("SES returned no MessageId");
  return result.MessageId;
}

/** Convenience for plain system mail: magic links, invitations, notices. */
export async function sendPlain(options: { from: string; to: string; replyTo?: string; subject: string; text: string; headers?: Record<string, string> }): Promise<string> {
  const raw = await buildRaw({
    from: options.from,
    to: options.to,
    replyTo: options.replyTo,
    subject: options.subject,
    text: options.text,
    headers: options.headers,
  });
  return sendRaw(raw, options.from, options.to);
}
