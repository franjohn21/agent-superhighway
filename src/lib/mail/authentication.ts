import type { SesReceiptNotification } from "./ses-notification";

/**
 * DMARC-style alignment, checked ourselves so a sender without a published
 * DMARC policy can still prove who they are. A message is authenticated when
 * SES reports dmarc=pass, or a passing DKIM signature's domain aligns with the
 * From domain, or a passing SPF mail-from domain aligns with it. Relaxed
 * alignment compares organizational domains, approximated as the last two
 * labels. A pass on an unrelated domain proves nothing and is ignored.
 */
export function isAuthenticated(
  authenticationResults: string[],
  fromDomain: string,
  receipt: SesReceiptNotification["receipt"],
): boolean {
  if (receipt.dmarcVerdict?.status === "PASS") return true;
  const from = organizationalDomain(fromDomain);
  for (const header of authenticationResults) {
    for (const clause of header.split(";")) {
      const trimmed = clause.trim();
      if (/^dmarc=pass\b/i.test(trimmed)) return true;
      if (/^dkim=pass\b/i.test(trimmed)) {
        const domain = /header\.(?:i=@|d=)([^\s;]+)/i.exec(trimmed)?.[1];
        if (domain && organizationalDomain(domain) === from) return true;
      }
      if (/^spf=pass\b/i.test(trimmed)) {
        const mailFrom = /smtp\.mailfrom=(?:[^\s;@]+@)?([^\s;]+)/i.exec(trimmed)?.[1];
        if (mailFrom && organizationalDomain(mailFrom) === from) return true;
      }
    }
  }
  return false;
}

export function isSpamOrVirus(receipt: SesReceiptNotification["receipt"]): boolean {
  return receipt.spamVerdict?.status === "FAIL" || receipt.virusVerdict?.status === "FAIL";
}

function organizationalDomain(domain: string): string {
  const labels = domain.toLowerCase().replace(/\.$/, "").split(".");
  return labels.slice(-2).join(".");
}
