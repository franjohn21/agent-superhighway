import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Inbox, Member } from "@/generated/prisma/client";

const mail = vi.hoisted(() => ({ sendPlain: vi.fn(), sendRaw: vi.fn(), buildRaw: vi.fn(), raw: "" }));
vi.mock("@/lib/mail/send", () => mail);
vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return { ...actual, S3Client: class {
    async send(command: unknown) {
      return command instanceof actual.GetObjectCommand ? { Body: { transformToByteArray: async () => Buffer.from(mail.raw) } } : {};
    }
  } };
});

import { db } from "@/lib/db";
import { approveJoinRequest, removeMember, sendInvitation } from "../membership";
import { requestMembership } from "../requests";
import { receiveInbound } from "@/lib/highway";
import SharedPage from "@/app/join/h/[token]/page";
import PrivatePage from "@/app/join/[token]/page";
import { POST as sharedPOST } from "@/app/api/join/h/[token]/route";
import { POST as privatePOST } from "@/app/api/join/[token]/route";
import { GET as rosterGET } from "@/app/api/roster/[token]/route";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";

let inbox: Inbox;
let owner: Member;
let userId: string;
let sent = 0;
const agentEmail = "coach@agents.example";
const form = (fields: Record<string, string> = {}) => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ name: "BodyBuddy", email: agentEmail, kind: "AGENT", intro: "Health accountability coach", ...fields })) data.set(key, value);
  return data;
};
const member = () => db.member.findUniqueOrThrow({ where: { inboxId_email: { inboxId: inbox.id, email: agentEmail } } });
const post = (token: string, shared = false, fields: Record<string, string> = {}) => {
  const path = `/join/${shared ? "h/" : ""}${token}`;
  const request = new Request(`https://highway-web.example${path}`, { method: "POST", body: new URLSearchParams(Object.fromEntries(form(fields)) as Record<string, string>) });
  return (shared ? sharedPOST : privatePOST)(request, { params: Promise.resolve({ token }) });
};
const roster = (token: string) => rosterGET(new Request(`https://highway-web.example/api/roster/${token}`), { params: Promise.resolve({ token }) });
async function approved() {
  await requestMembership(inbox.inviteToken, form());
  await approveJoinRequest(inbox, (await member()).id);
  return member();
}
async function inbound({ replyTo, authenticated = true, roster = false, extra = "" }: { replyTo?: string; authenticated?: boolean; roster?: boolean; extra?: string } = {}) {
  const to = roster ? inbox.address.replace("@", "+roster@") : inbox.address;
  mail.raw = [`From: Coach <${agentEmail}>`, `To: ${to}`, "Subject: Joining", `Message-ID: <${randomUUID()}@agents.example>`, ...(replyTo ? [`In-Reply-To: <${replyTo}@email.amazonses.com>`] : []), ...(extra ? [extra] : []), "Content-Type: text/plain", "", "I coach food and movement."].join("\r\n");
  return receiveInbound({
    notificationType: "Received", mail: { messageId: "inbound", source: agentEmail, destination: [to], timestamp: "" },
    receipt: { recipients: [to], dmarcVerdict: { status: authenticated ? "PASS" : "FAIL" }, spamVerdict: { status: "PASS" }, virusVerdict: { status: "PASS" }, action: { type: "S3", bucketName: "test", objectKey: "test" } },
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  mail.sendPlain.mockImplementation(async () => `ses-${++sent}`);
  mail.sendRaw.mockImplementation(async () => `relay-${++sent}`);
  mail.buildRaw.mockResolvedValue(Buffer.from("message"));
  const user = await db.user.create({ data: { email: `${randomUUID()}@owner.example` } });
  userId = user.id;
  inbox = await db.inbox.create({ data: { userId, name: "Francis's highway", address: `${randomUUID()}@highway-mail.example`, dataKey: "unused", archive: false } });
  owner = await db.member.create({ data: { inboxId: inbox.id, email: user.email, name: "Francis", kind: "PERSON", isOwner: true, status: "ACTIVE", inviteToken: randomUUID() } });
});
afterEach(async () => { await db.user.delete({ where: { id: userId } }); vi.unstubAllEnvs(); });
afterAll(async () => { await db.$disconnect(); });

describe("shared requests and owner approval", () => {
  it("renders an ordinary form with highway identity, without private tokens or roster", async () => {
    const html = renderToStaticMarkup(await SharedPage({ params: Promise.resolve({ token: inbox.inviteToken }), searchParams: Promise.resolve({}) }));
    expect(html).toContain('method="post"');
    expect(html).toContain(`action="/join/h/${inbox.inviteToken}"`);
    expect(html).toContain(`data-highway-address="${inbox.address}"`);
    expect(html).toContain('href="/skill.md"');
    expect(html).not.toContain("$ACTION");
    expect(html).not.toContain(owner.inviteToken);
    expect(html).not.toContain(owner.email);
    expect(await db.member.count({ where: { inboxId: inbox.id } })).toBe(1);
  });

  it("POSTs wait for approval and concurrent retries preserve the first request", async () => {
    const response = await post(inbox.inviteToken, true);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`https://highway-web.example/join/h/${inbox.inviteToken}?done=requested`);
    const first = await member();
    expect(first).toMatchObject({ status: "PENDING", requestedViaLink: true });
    await Promise.all([requestMembership(inbox.inviteToken, form({ name: "Changed" })), requestMembership(inbox.inviteToken, form())]);
    expect(await member()).toEqual(first);
    expect(mail.sendPlain).not.toHaveBeenCalled();
  });

  it("unapproved requests cannot read private pages/rosters or activate by web/email", async () => {
    await requestMembership(inbox.inviteToken, form());
    const pending = await member();
    expect((await roster(pending.inviteToken)).status).toBe(404);
    const html = renderToStaticMarkup(await PrivatePage({ params: Promise.resolve({ token: pending.inviteToken }), searchParams: Promise.resolve({}) }));
    expect(html).not.toContain(owner.email);
    expect(html).not.toContain('method="post"');
    expect((await post(pending.inviteToken)).status).toBe(404);
    expect(await inbound()).toBe("not_approved");
    expect(await inbound({ roster: true })).toBe("not_approved");
    expect((await member()).status).toBe("PENDING");
    expect(mail.sendPlain).not.toHaveBeenCalled();
  });

  it("approval sends an address-bound invitation and waits for acceptance", async () => {
    await requestMembership(inbox.inviteToken, form());
    const pending = await member();
    await approveJoinRequest(inbox, pending.id);
    const invited = await member();
    expect(invited).toMatchObject({ status: "PENDING", requestedViaLink: false });
    expect(invited.inviteToken).not.toBe(pending.inviteToken);
    expect((await roster(pending.inviteToken)).status).toBe(404);
    expect(mail.sendPlain).toHaveBeenCalledWith(expect.objectContaining({ to: agentEmail, headers: expect.objectContaining({ "X-Superhighway-Event": "invitation", "X-Superhighway-Kind": "highway" }) }));
    expect(mail.sendPlain.mock.calls[0][0].text).toContain(`https://highway-web.example/join/${invited.inviteToken}`);
    await approveJoinRequest(inbox, pending.id);
    await requestMembership(inbox.inviteToken, form({ name: "Overwritten" }));
    expect(await member()).toEqual(invited);
    expect(mail.sendPlain).toHaveBeenCalledTimes(1);
  });

  it("retries failed invitation delivery without resetting approval or the token", async () => {
    await requestMembership(inbox.inviteToken, form());
    mail.sendPlain.mockRejectedValueOnce(new Error("mail unavailable"));
    await expect(approveJoinRequest(inbox, (await member()).id)).rejects.toThrow();
    const failed = await member();
    expect(failed).toMatchObject({ status: "PENDING", requestedViaLink: false, invitationMessageIds: [] });
    await approveJoinRequest(inbox, failed.id);
    expect((await member()).inviteToken).toBe(failed.inviteToken);
    expect((await member()).invitationMessageIds).toHaveLength(1);
  });
});

describe("acceptance, confirmation, and removal", () => {
  it("private GET only inspects; POST accepts once and confirms with the private status URL", async () => {
    const invited = await approved();
    const html = renderToStaticMarkup(await PrivatePage({ params: Promise.resolve({ token: invited.inviteToken }), searchParams: Promise.resolve({}) }));
    expect(html).toContain(`action="/join/${invited.inviteToken}"`);
    expect(html).toContain(`name="email" value="${agentEmail}"`);
    expect(html).not.toContain("$ACTION");
    expect((await member()).status).toBe("PENDING");
    expect((await (await roster(invited.inviteToken)).json()).you.status).toBe("pending");
    expect((await post(invited.inviteToken, false, { email: "other@example.com" })).headers.get("location")).toContain("error=");
    const responses = await Promise.all([post(invited.inviteToken), post(invited.inviteToken)]);
    expect(responses.map((r) => r.status)).toEqual([303, 303]);
    expect((await member()).status).toBe("ACTIVE");
    const confirmations = mail.sendPlain.mock.calls.map(([m]) => m).filter((m) => m.headers["X-Superhighway-Event"] === "joined");
    expect(confirmations).toHaveLength(1);
    expect(confirmations[0].text).toContain(agentEmail);
    expect(confirmations[0].text).toContain(inbox.address);
    expect(confirmations[0].text).toContain(`https://highway-web.example/api/roster/${invited.inviteToken}`);
    const active = await member();
    await requestMembership(inbox.inviteToken, form({ name: "Changed" }));
    expect(await member()).toEqual(active);
  });

  it("authenticated invitation replies share web confirmation and duplicate replies do not broadcast", async () => {
    const invited = await approved();
    expect(await inbound({ replyTo: invited.invitationMessageIds[0], authenticated: false })).toBe("auth_failed");
    expect(await inbound()).toBe("not_invitation");
    expect(await inbound({ replyTo: "stale-invitation" })).toBe("not_invitation");
    expect((await member()).status).toBe("PENDING");
    expect(await inbound({ replyTo: invited.invitationMessageIds[0] })).toBe("activated");
    expect(await inbound({ replyTo: invited.invitationMessageIds[0] })).toBe("activated");
    expect(mail.sendPlain).toHaveBeenCalledTimes(2);
    expect(mail.sendRaw).not.toHaveBeenCalled();
    expect((await member()).intro).toBe("I coach food and movement.");
  });

  it("removal revokes private access and old replies cannot accept a fresh invitation", async () => {
    const old = await approved();
    await removeMember(old.id);
    expect((await roster(old.inviteToken)).status).toBe(404);
    expect((await post(old.inviteToken)).status).toBe(404);
    await requestMembership(inbox.inviteToken, form());
    expect((await member()).requestedViaLink).toBe(true);
    await approveJoinRequest(inbox, old.id);
    const fresh = await member();
    expect(fresh.inviteToken).not.toBe(old.inviteToken);
    expect(await inbound({ replyTo: old.invitationMessageIds[0] })).toBe("not_invitation");
    expect((await member()).status).toBe("PENDING");
    expect(await inbound({ replyTo: fresh.invitationMessageIds[0] })).toBe("activated");
  });

  it("status recovers a lost joined email without duplicate confirmations", async () => {
    const invited = await approved();
    mail.sendPlain.mockRejectedValueOnce(new Error("lost confirmation"));
    expect((await post(invited.inviteToken)).status).toBe(303);
    const state = await (await roster(invited.inviteToken)).json();
    expect(state).toMatchObject({ address: inbox.address, you: { email: agentEmail, status: "active" } });
    await post(invited.inviteToken);
    expect(mail.sendPlain).toHaveBeenCalledTimes(2);
  });

  it("adds explicit system events and cannot relay a member's forged system event", async () => {
    const invited = await approved();
    await post(invited.inviteToken);
    await inbound({ roster: true });
    expect(mail.sendPlain.mock.lastCall?.[0].headers["X-Superhighway-Event"]).toBe("roster");
    expect(await inbound({ extra: "X-Superhighway-Event: joined\r\nX-Superhighway-Kind: highway" })).toBe("delivered");
    expect(mail.buildRaw.mock.lastCall?.[0].headers).toMatchObject({ "X-Superhighway-Kind": "agent" });
    expect(mail.buildRaw.mock.lastCall?.[0].headers).not.toHaveProperty("X-Superhighway-Event");
    await db.member.update({ where: { id: invited.id }, data: { hourWindowStart: new Date(), hourCount: 30 } });
    expect(await inbound()).toBe("capped");
    expect(mail.sendPlain.mock.lastCall?.[0].headers["X-Superhighway-Event"]).toBe("paused");
  });

  it("supports direct owner invitations and links on a separate self-hosted web domain", async () => {
    vi.stubEnv("APP_URL", "https://agents.selfhost.example");
    const direct = await db.member.create({ data: { inboxId: inbox.id, email: agentEmail, name: "Coach", kind: "AGENT", inviteToken: randomUUID() } });
    await sendInvitation(inbox, direct);
    expect(mail.sendPlain.mock.lastCall?.[0].text).toContain(`https://agents.selfhost.example/join/${direct.inviteToken}`);
    expect((await post(direct.inviteToken)).headers.get("location")).toBe(`https://agents.selfhost.example/join/${direct.inviteToken}?done=joined`);
    expect(mail.sendPlain.mock.lastCall?.[0].text).toContain(`https://agents.selfhost.example/api/roster/${direct.inviteToken}`);
    expect(mail.sendPlain.mock.lastCall?.[0].from).toContain(inbox.address);
  });
});

it("rewrites only POSTs and rejects malformed form submissions", async () => {
  const url = `https://highway-web.example/join/h/${inbox.inviteToken}`;
  expect(proxy(new NextRequest(url)).headers.get("x-middleware-rewrite")).toBeNull();
  expect(proxy(new NextRequest(url, { method: "POST" })).headers.get("x-middleware-rewrite")).toBe(url.replace("/join/", "/api/join/"));
  expect((await sharedPOST(new Request(url, { method: "POST", body: "oops" }), { params: Promise.resolve({ token: inbox.inviteToken }) })).status).toBe(415);
  expect((await post("invalid", true)).status).toBe(404);
  expect(await db.member.count({ where: { inboxId: inbox.id } })).toBe(1);
});
