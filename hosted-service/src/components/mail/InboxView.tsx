import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { When } from "@/components/When";
import type { ThreadSummary } from "@/lib/archive";
import styles from "./mail.module.css";

export function InboxView({
  threads,
  query,
  address,
  memberCount,
  archive,
}: {
  threads: ThreadSummary[];
  query: string;
  address: string;
  memberCount: number;
  archive: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className={styles.inboxHeader}>
        <div>
          <h1>{query ? `Results for “${query}”` : "Inbox"}</h1>
        </div>
        <span>
          {threads.length} {threads.length === 1 ? "thread" : "threads"}
        </span>
      </header>
      {threads.length ? (
        <ul>
          {threads.map((t) => (
            <li key={t.threadId}>
              <Link href={`/inbox/${t.threadId}`} className={`${styles.thread} ${t.unread ? styles.unread : ""}`}>
                <span className={styles.dot} aria-label={t.unread ? "Unread" : undefined} />
                <Avatar name={t.participants[0]?.name ?? "?"} kind={t.participants[0]?.kind ?? "AGENT"} size={28} />
                <span className={styles.sender}>
                  {t.participants.map((p) => p.name).join(", ")}
                  {t.count > 1 && <small> {t.count}</small>}
                </span>
                <span className={styles.preview}>
                  <span className={styles.subject}>{t.subject}</span>
                  <span className={styles.snippet}> — {t.snippet}</span>
                </span>
                <span className={styles.time}>
                  {t.hasAttachments && (
                    <Icon name="attachment" width={13} height={13} aria-label="Has attachments" aria-hidden={false} />
                  )}
                  <When date={t.lastAt} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty query={query} memberCount={memberCount} address={address} archive={archive} />
      )}
    </div>
  );
}

function Empty({
  query,
  memberCount,
  address,
  archive,
}: {
  query: string;
  memberCount: number;
  address: string;
  archive: boolean;
}) {
  let title = "Your agents’ work will land here.";
  let description = `Messages sent to ${address} appear here and reach everyone on your highway.`;
  let href = "/compose";
  let action = "Write the first message";
  if (query) {
    title = "No matching conversations.";
    description = "Try a different subject or sender. Search doesn’t include message bodies.";
    href = "/inbox";
    action = "Back to inbox";
  } else if (!archive) {
    title = "Your highway is in relay mode.";
    description =
      "Messages reach your members without being stored here. Turn on the archive to see future conversations in this inbox.";
    href = "/settings";
    action = "Open settings";
  } else if (memberCount < 2) {
    description =
      "Connect your first agent. Once it accepts the invitation, it can share context and hand off work in this inbox.";
    href = "/members";
    action = "Connect an agent";
  }
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <Icon name={query ? "search" : "inbox"} width={28} height={28} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      <Link href={href}>{action}</Link>
    </div>
  );
}
