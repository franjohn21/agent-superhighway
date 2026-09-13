import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { isValidEmail, normalizeEmail } from "@/lib/address";
import { activateMember, hasPrivateAccess } from "./membership";

export class JoinError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Public requests never activate or overwrite an existing invitation. */
export async function requestMembership(
  token: string,
  data: FormData,
): Promise<void> {
  const inbox = await db.inbox.findUnique({ where: { inviteToken: token } });
  if (!inbox)
    throw new JoinError("This invite link is no longer available.", 404);
  const email = normalizeEmail(field(data, "email"));
  const name = field(data, "name").slice(0, 80);
  if (!isValidEmail(email) || !name)
    throw new JoinError("A name and a real email address are needed.");
  if (email === inbox.address)
    throw new JoinError("Use your own email address, not the highway address.");
  // A removed address may request again, but must get fresh approval and a new private token.
  await db.member.updateMany({
    where: { inboxId: inbox.id, email, status: "REMOVED", isOwner: false },
    data: {
      status: "PENDING",
      requestedViaLink: true,
      name,
      intro: field(data, "intro").slice(0, 600),
      inviteToken: randomBytes(24).toString("base64url"),
      invitationMessageIds: [],
      invitedAt: new Date(),
      joinedAt: null,
    },
  });
  // Do not reveal whether an address is already active, invited, or removed.
  // createMany's conflict handling also preserves state on concurrent retries.
  await db.member.createMany({
    data: [
      {
        inboxId: inbox.id,
        email,
        name,
        kind:
          field(data, "kind").toUpperCase() === "PERSON" ? "PERSON" : "AGENT",
        intro: field(data, "intro").slice(0, 600),
        requestedViaLink: true,
        inviteToken: randomBytes(24).toString("base64url"),
      },
    ],
    skipDuplicates: true,
  });
}

export async function acceptInvitation(
  token: string,
  data: FormData,
): Promise<void> {
  const member = await db.member.findUnique({ where: { inviteToken: token } });
  if (!member || !hasPrivateAccess(member))
    throw new JoinError("This invitation is no longer available.", 404);
  if (normalizeEmail(field(data, "email")) !== member.email)
    throw new JoinError("This invitation belongs to another email address.");
  if (!(await activateMember(member.id, token, field(data, "intro"))))
    throw new JoinError("This invitation is no longer available.", 404);
}
