"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateAddress, isValidEmail, isValidSlug, normalizeEmail, normalizeSlug } from "@/lib/address";
import { newWrappedDataKey } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireInbox } from "@/lib/guard";
import { postFromOwner, removeMember, sendInvitation } from "@/lib/highway";
import { sendPlain } from "@/lib/mail/send";
import { magicLinkText } from "@/lib/mail/templates";
import { currentUser, destroySession } from "@/lib/session";

const LOGIN_TOKEN_MINUTES = 15;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function requestLogin(formData: FormData): Promise<void> {
  const email = normalizeEmail(field(formData, "email"));
  if (!isValidEmail(email)) redirect("/login?error=Enter+a+real+email+address");
  const token = randomBytes(32).toString("base64url");
  await db.loginToken.create({ data: { email, token, expiresAt: new Date(Date.now() + LOGIN_TOKEN_MINUTES * 60 * 1000) } });
  try {
    await sendPlain({ from: env.systemFrom, to: email, subject: "Sign in to Agent Superhighway", text: magicLinkText(`${env.appUrl}/auth/verify?token=${token}`) });
  } catch (error) {
    redirect(`/login?error=${encodeURIComponent(`Could not send to ${email}: ${errorMessage(error)}`)}`);
  }
  redirect(`/login?sent=${encodeURIComponent(email)}`);
}

export async function createInbox(formData: FormData): Promise<void> {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (me.inbox) redirect("/inbox");
  const name = field(formData, "name");
  const ownerName = field(formData, "ownerName");
  const slug = normalizeSlug(field(formData, "slug"));
  if (!name || !ownerName) redirect("/setup?error=Both+names+are+needed");
  if (!isValidSlug(slug)) redirect("/setup?error=The+address+can+use+letters%2C+numbers+and+dashes");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const address = generateAddress(slug);
    const taken = await db.inbox.findUnique({ where: { address } });
    if (taken) continue;
    await db.inbox.create({
      data: {
        userId: me.id,
        address,
        name,
        dataKey: newWrappedDataKey(),
        members: {
          create: { email: me.email, name: ownerName, kind: "PERSON", status: "ACTIVE", isOwner: true, joinedAt: new Date(), inviteToken: randomBytes(24).toString("base64url") },
        },
      },
    });
    redirect("/inbox");
  }
  redirect("/setup?error=Try+a+different+address");
}

export async function addMember(formData: FormData): Promise<void> {
  const { inbox } = await requireInbox();
  const email = normalizeEmail(field(formData, "email"));
  const name = field(formData, "name");
  const kind = field(formData, "kind") === "PERSON" ? "PERSON" : "AGENT";
  const role = field(formData, "role").slice(0, 200);
  if (!isValidEmail(email) || !name) redirect("/members?error=A+name+and+a+real+email+address+are+needed");
  if (!role) redirect("/members?error=Say+what+they+are+to+you%3B+that+is+how+the+other+agents+know+who+does+what");
  if (email === inbox.address) redirect("/members?error=That+is+the+highway+itself");
  const existing = await db.member.findUnique({ where: { inboxId_email: { inboxId: inbox.id, email } } });
  if (existing && existing.status !== "REMOVED") redirect("/members?error=Already+on+the+member+list");
  const member = existing
    ? await db.member.update({ where: { id: existing.id }, data: { name, kind, role, status: "PENDING", inviteToken: randomBytes(24).toString("base64url"), invitedAt: new Date(), joinedAt: null } })
    : await db.member.create({ data: { inboxId: inbox.id, email, name, kind, role, inviteToken: randomBytes(24).toString("base64url") } });
  revalidatePath("/", "layout");
  try {
    await sendInvitation(inbox, member);
  } catch (error) {
    redirect(`/members?error=${encodeURIComponent(`Added, but the invitation email could not be sent (${errorMessage(error)}). Open Manage and copy the invite link instead; sending it to them any other way works the same.`)}`);
  }
  revalidatePath("/members");
  redirect("/members");
}

export async function updateMemberRole(formData: FormData): Promise<void> {
  const { inbox } = await requireInbox();
  const role = field(formData, "role").slice(0, 200);
  const intro = field(formData, "intro").slice(0, 600);
  await db.member.updateMany({ where: { id: field(formData, "memberId"), inboxId: inbox.id, isOwner: false }, data: { role, intro } });
  revalidatePath("/members");
  redirect("/members");
}

export async function resendInvitation(formData: FormData): Promise<void> {
  const { inbox } = await requireInbox();
  const member = await db.member.findFirst({ where: { id: field(formData, "memberId"), inboxId: inbox.id, status: "PENDING" } });
  if (!member) redirect("/members");
  try {
    await sendInvitation(inbox, member);
  } catch (error) {
    redirect(`/members?error=${encodeURIComponent(`Could not send: ${errorMessage(error)}`)}`);
  }
  redirect("/members?sent=1");
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const { inbox } = await requireInbox();
  const member = await db.member.findFirst({ where: { id: field(formData, "memberId"), inboxId: inbox.id, isOwner: false } });
  if (member) await removeMember(member.id);
  revalidatePath("/", "layout");
  redirect("/members");
}

export async function sendMessage(formData: FormData): Promise<void> {
  const { inbox } = await requireInbox();
  const owner = await db.member.findFirst({ where: { inboxId: inbox.id, isOwner: true } });
  if (!owner) throw new Error("Inbox has no owner member");
  const text = field(formData, "text");
  const subject = field(formData, "subject");
  const threadId = field(formData, "threadId") || undefined;
  if (!text) redirect(threadId ? `/inbox/${threadId}` : "/compose?error=Write+something+first");
  if (!threadId && !subject) redirect("/compose?error=A+subject+helps+everyone+thread+it");
  const landedIn = await postFromOwner(inbox, owner, { subject, text, threadId });
  revalidatePath("/inbox");
  redirect(inbox.archive ? `/inbox/${landedIn}` : "/inbox");
}

export async function updateSettings(formData: FormData): Promise<void> {
  const { inbox } = await requireInbox();
  const name = field(formData, "name");
  const archive = formData.get("archive") === "on";
  await db.inbox.update({ where: { id: inbox.id }, data: { name: name || inbox.name, archive } });
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function deleteAccount(): Promise<void> {
  const { user } = await requireInbox();
  await db.user.delete({ where: { id: user.id } });
  await destroySession();
  redirect("/?deleted=1");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
