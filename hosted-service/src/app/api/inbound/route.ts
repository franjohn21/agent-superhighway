import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { receiveInbound } from "@/lib/highway";
import { parseSesReceiptNotification } from "@/lib/mail/ses-notification";
import { isSnsAwsUrl, parseSnsEnvelope, verifySnsSignature } from "@/lib/mail/sns";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * SNS posts SES receipt notifications here. The signature is checked against
 * AWS's certificate, the topic is pinned, the subscription confirms itself,
 * and every trusted envelope gets a 200 so SNS never retries work already done.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let envelope;
  try {
    envelope = parseSnsEnvelope(await request.text());
  } catch {
    return NextResponse.json({ error: "Invalid SNS envelope" }, { status: 400 });
  }
  if (!(await verifySnsSignature(envelope))) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  const expectedTopic = env.inboundTopicArn;
  if (expectedTopic && envelope.TopicArn !== expectedTopic) return NextResponse.json({ error: "Unexpected topic" }, { status: 403 });

  if (envelope.Type === "SubscriptionConfirmation") {
    if (envelope.SubscribeURL && isSnsAwsUrl(envelope.SubscribeURL)) await fetch(envelope.SubscribeURL);
    return NextResponse.json({ confirmed: true });
  }
  if (envelope.Type === "UnsubscribeConfirmation") return NextResponse.json({ received: true });

  try {
    const outcome = await receiveInbound(parseSesReceiptNotification(envelope.Message));
    console.info("inbound", outcome);
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    console.error("inbound failed", error);
    return NextResponse.json({ received: true, outcome: "failed" });
  }
}
