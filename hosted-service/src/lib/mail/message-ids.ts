/** Message-ID helpers. Clients cite each other by the part before the @. */
export function messageIdKey(messageId: string): string {
  const bare = messageId.trim().replace(/^<|>$/g, "").toLowerCase();
  const at = bare.indexOf("@");
  return at === -1 ? bare : bare.slice(0, at);
}

export function referencedKeys(inReplyTo: string | undefined, references: string | string[] | undefined): string[] {
  const raw: string[] = [];
  if (inReplyTo) raw.push(inReplyTo);
  if (Array.isArray(references)) raw.push(...references);
  else if (references) raw.push(...references.split(/\s+/));
  return Array.from(new Set(raw.filter(Boolean).map(messageIdKey)));
}

/** The Message-ID header SES writes on a message it sent from this region. */
export function sesMessageIdHeader(sesMessageId: string, region: string): string {
  const domain = region === "us-east-1" ? "email.amazonses.com" : `${region}.amazonses.com`;
  return `<${sesMessageId}@${domain}>`;
}

export function subjectKey(subject: string): string {
  let key = subject.trim().toLowerCase();
  let previous = "";
  while (key !== previous) {
    previous = key;
    key = key.replace(/^(re|fwd?|aw|wg)\s*(\[\d+\])?\s*:\s*/i, "").trim();
  }
  return key;
}
