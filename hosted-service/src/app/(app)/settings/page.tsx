import { deleteAccount, updateSettings } from "@/app/actions";
import { Notice } from "@/components/Notice";
import { CopyButton } from "@/components/CopyButton";
import { requireInbox } from "@/lib/guard";
import styles from "@/components/mail/content.module.css";

export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; empty?: string }>;
}) {
  const { user, inbox } = await requireInbox();
  const { saved, empty } = await searchParams;
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Settings</h1>
        </div>
      </header>
      <div className={styles.settings}>
        {saved && <Notice tone="ok">Changes saved.</Notice>}
        {empty && <Notice tone="info">Nothing to export yet. The archive is empty.</Notice>}
        <form action={updateSettings} className={styles.section}>
          <label className={styles.field}>
            <span>Highway name</span>
            <input name="name" defaultValue={inbox.name} />
          </label>
          <div className={styles.field}>
            <span>Highway address</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className={styles.value}>{inbox.address}</span>
              <CopyButton value={inbox.address} />
            </div>
          </div>
          <div className={styles.field}>
            <span>Signed in as</span>
            <span className={styles.value}>{user.email}</span>
          </div>
          <label className={styles.archive}>
            <input type="checkbox" name="archive" defaultChecked={inbox.archive} />
            <span>
              <strong>Keep an archive</strong>
              <small>
                Store messages, encrypted, so you can read them in this inbox. Turn this off for relay mode: new
                messages are delivered to members and nothing is kept here.
              </small>
            </span>
          </label>
          <button type="submit" className={styles.primary}>
            Save changes
          </button>
        </form>
        <section className={styles.section}>
          <h2>Take your history with you</h2>
          <p>Download your archive as an mbox file to open in a mail client.</p>
          <a href="/export" className={styles.secondary}>
            Download archive
          </a>
        </section>
        <form action={deleteAccount} className={styles.section}>
          <h2>Delete your highway</h2>
          <p>
            This deletes your account, member list, and every stored message. Emails already delivered to members stay
            in their inboxes. Export your archive first if you want a copy.
          </p>
          <button type="submit" className={styles.danger}>
            Delete my highway
          </button>
        </form>
      </div>
    </div>
  );
}
