import "dotenv/config";
/**
 * Local end-to-end check of the highway path. Needs .env pointing at a scratch
 * database, SES sandbox access, and AWS_PROFILE with write access to the inbound
 * bucket. Sends real mail to the SES mailbox simulator only.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { newWrappedDataKey } from "@/lib/crypto";
import { generateAddress } from "@/lib/address";
import { postFromOwner, receiveInbound } from "@/lib/highway";
import { getThread, listThreads } from "@/lib/archive";
import { mboxChunks } from "@/lib/mbox";

const SIM = "success@simulator.amazonses.com";
/** A second simulator address so the owner is a deliverable recipient in the SES sandbox. */
const OWNER = "ooto@simulator.amazonses.com";

async function main() {
  await db.user.deleteMany({ where: { email: OWNER } });
  const user = await db.user.create({ data: { email: OWNER } });
  const inbox = await db.inbox.create({
    data: {
      userId: user.id, address: generateAddress("e2e"), name: "E2E Highway", dataKey: newWrappedDataKey(),
      members: { create: [
        { email: user.email, name: "Francis", kind: "PERSON", status: "ACTIVE", isOwner: true, joinedAt: new Date(), inviteToken: randomBytes(12).toString("hex") },
        { email: SIM, name: "SimBot", kind: "AGENT", status: "ACTIVE", joinedAt: new Date(), inviteToken: randomBytes(12).toString("hex") },
      ] },
    },
    include: { members: true },
  });
  const owner = inbox.members.find((m) => m.isOwner)!;
  console.log("inbox", inbox.address);

  // 1. Owner posts from the web. Redelivered to SimBot via real SES (mailbox simulator).
  const threadId = await postFromOwner(inbox, owner, { subject: "Travel next week", text: "Hotel gym only Tue-Thu. Adjust the plan." });
  const first = await db.message.findFirstOrThrow({ where: { threadId } });
  assert.equal(first.deliveredTo, 1, `deliveredTo=1 (${first.deliveryError})`);
  assert.equal(first.sesMessageIds.length, 1);
  console.log("owner post delivered, ses id", first.sesMessageIds[0]);

  // 2. SimBot replies by email citing the SES id it received. Drop the raw in S3 and feed a notification.
  const raw = [
    `From: SimBot <${SIM}>`,
    `To: ${inbox.address}`,
    `Subject: Re: Travel next week`,
    `Message-ID: <reply-1@simulator.amazonses.com>`,
    `In-Reply-To: <${first.sesMessageIds[0]}@email.amazonses.com>`,
    `Authentication-Results: amazonses.com; spf=pass smtp.mailfrom=bounces.simulator.amazonses.com; dkim=pass header.i=@simulator.amazonses.com; dmarc=none`,
    `Date: ${new Date().toUTCString()}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    `Got it. Swapping Tue-Thu to dumbbell sessions. Plan attached in the next message.`,
  ].join("\r\n");
  const key = `inbound/e2e-${Date.now()}`;
  // Writing into the inbound bucket is SES's job; the app key cannot. Run with AWS_PROFILE set to an account admin.
  const s3 = new S3Client({ region: env.inboundBucketRegion });
  await s3.send(new PutObjectCommand({ Bucket: env.inboundBucket, Key: key, Body: raw }));
  const outcome = await receiveInbound({
    notificationType: "Received",
    mail: { messageId: key, source: SIM, destination: [inbox.address], timestamp: new Date().toISOString() },
    receipt: { recipients: [inbox.address], spfVerdict: { status: "PASS" }, dkimVerdict: { status: "PASS" }, dmarcVerdict: { status: "GRAY" }, spamVerdict: { status: "PASS" }, virusVerdict: { status: "PASS" }, action: { type: "S3", bucketName: env.inboundBucket, objectKey: key } },
  });
  assert.equal(outcome, "delivered");
  const reply = await db.message.findFirstOrThrow({ where: { inboxId: inbox.id, messageIdKey: "reply-1" } });
  assert.equal(reply.threadId, threadId, "reply landed in the same thread");
  assert.equal(reply.deliveredTo, 1, `redelivered to the owner (${reply.deliveryError})`);
  console.log("reply threaded and redelivered", reply.deliveryError ?? "");

  // 3. Stranger is dropped. Unauthenticated member is dropped.
  const strangerKey = `inbound/e2e-stranger-${Date.now()}`;
  await s3.send(new PutObjectCommand({ Bucket: env.inboundBucket, Key: strangerKey, Body: raw.replace(SIM, "stranger@evil.test") }));
  const strangerOutcome = await receiveInbound({ notificationType: "Received", mail: { messageId: strangerKey, source: "stranger@evil.test", destination: [inbox.address], timestamp: "" }, receipt: { recipients: [inbox.address], action: { type: "S3", bucketName: env.inboundBucket, objectKey: strangerKey } } });
  assert.equal(strangerOutcome, "not_member");
  const spoofKey = `inbound/e2e-spoof-${Date.now()}`;
  await s3.send(new PutObjectCommand({ Bucket: env.inboundBucket, Key: spoofKey, Body: raw.replace(/Authentication-Results:.*\r\n/, "Authentication-Results: amazonses.com; spf=fail; dkim=fail;\r\n") }));
  const spoofOutcome = await receiveInbound({ notificationType: "Received", mail: { messageId: spoofKey, source: SIM, destination: [inbox.address], timestamp: "" }, receipt: { recipients: [inbox.address], spfVerdict: { status: "FAIL" }, dkimVerdict: { status: "FAIL" }, action: { type: "S3", bucketName: env.inboundBucket, objectKey: spoofKey } } });
  assert.equal(spoofOutcome, "auth_failed");
  console.log("stranger + spoof dropped");

  // 3b. A member asks who is on the highway via the +roster address; answered, not fanned out.
  const rosterKey = `inbound/e2e-roster-${Date.now()}`;
  const rosterAddr = inbox.address.replace("@", "+roster@");
  await s3.send(new PutObjectCommand({ Bucket: env.inboundBucket, Key: rosterKey, Body: raw.replace(`To: ${inbox.address}`, `To: ${rosterAddr}`).replace("Subject: Re: Travel next week", "Subject: who is here") }));
  const rosterOutcome = await receiveInbound({ notificationType: "Received", mail: { messageId: rosterKey, source: SIM, destination: [rosterAddr], timestamp: "" }, receipt: { recipients: [rosterAddr], dkimVerdict: { status: "PASS" }, action: { type: "S3", bucketName: env.inboundBucket, objectKey: rosterKey } } });
  assert.equal(rosterOutcome, "roster");
  console.log("roster request answered");

  // 4. Archive reads and export decrypt.
  const threads = await listThreads(inbox);
  assert.equal(threads.length, 1);
  assert.equal(threads[0].count, 2);
  assert.ok(threads[0].snippet.startsWith("Got it."));
  const thread = await getThread(inbox, threadId);
  assert.equal(thread[1].text.trim().startsWith("Got it."), true);
  let mbox = "";
  for await (const chunk of mboxChunks(inbox)) mbox += chunk;
  assert.equal((mbox.match(/^From /gm) ?? []).length, 2);
  assert.ok(mbox.includes("Swapping Tue-Thu"));
  console.log("archive + mbox ok");
  await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
  console.log("E2E OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
