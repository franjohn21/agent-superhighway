/** The SES "Received" notification for a receipt rule S3 action. */
export interface SesVerdict {
  status: "PASS" | "FAIL" | "GRAY" | "PROCESSING_FAILED" | "DISABLED";
}

export interface SesReceiptNotification {
  notificationType: "Received";
  mail: {
    messageId: string;
    source: string;
    destination: string[];
    timestamp: string;
  };
  receipt: {
    recipients: string[];
    spfVerdict?: SesVerdict;
    dkimVerdict?: SesVerdict;
    dmarcVerdict?: SesVerdict;
    spamVerdict?: SesVerdict;
    virusVerdict?: SesVerdict;
    action: { type: string; bucketName?: string; objectKey?: string };
  };
}

export function parseSesReceiptNotification(message: string): SesReceiptNotification {
  const parsed: unknown = JSON.parse(message);
  if (!parsed || typeof parsed !== "object") throw new Error("SES notification is not an object");
  const record = parsed as Partial<SesReceiptNotification>;
  if (record.notificationType !== "Received") throw new Error(`Unexpected SES notification type ${String(record.notificationType)}`);
  if (!record.mail || typeof record.mail.messageId !== "string" || typeof record.mail.source !== "string") {
    throw new Error("SES notification missing mail.messageId or mail.source");
  }
  if (!record.receipt || !Array.isArray(record.receipt.recipients)) throw new Error("SES notification missing receipt.recipients");
  if (record.receipt.action?.type !== "S3" || !record.receipt.action.bucketName || !record.receipt.action.objectKey) {
    throw new Error("SES notification is not an S3 action");
  }
  return record as SesReceiptNotification;
}
