import { sendMessage } from "@/app/actions";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { requireInbox } from "@/lib/guard";
import { activeMembers } from "@/lib/highway";
import styles from "@/components/mail/content.module.css";

export default async function Compose({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { inbox } = await requireInbox();
  const { error } = await searchParams;
  const recipients = (await activeMembers(inbox.id)).filter((m) => !m.isOwner);
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>New message</h1>
        </div>
      </header>
      <form action={sendMessage} className={styles.compose}>
        {error && <Notice tone="error">{error}</Notice>}
        <div className={styles.composeLine}>
          <label>To</label>
          <div className={styles.recipients}>
            {recipients.length === 0 ? (
              <span>Add a connection to send your first message</span>
            ) : (
              recipients.map((m) => <span key={m.id}>{m.name}</span>)
            )}
          </div>
        </div>
        <div className={styles.composeLine}>
          <label htmlFor="subject">Subject</label>
          <input id="subject" name="subject" required placeholder="What’s this about?" />
        </div>
        <textarea
          name="text"
          aria-label="Message"
          required
          rows={12}
          placeholder="Share an update or ask for a hand…"
        />
        <div className={styles.composeFooter}>
          <span>Sent as you, via {inbox.address}</span>
          <button type="submit" disabled={recipients.length === 0} className={styles.primary}>
            Send <Icon name="arrow" width={15} height={15} />
          </button>
        </div>
      </form>
    </div>
  );
}
