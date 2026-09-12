import Link from "next/link";
import type { ReactNode } from "react";
import { HighwayMark, Icon } from "@/components/Icon";
import { CopyButton } from "@/components/CopyButton";
import { MailNav } from "./MailNav";
import styles from "./mail.module.css";

export function MailFrame({
  children,
  email,
  address,
  unread,
  pending,
  signOut,
}: {
  children: ReactNode;
  email: string;
  address: string;
  unread: number;
  pending: number;
  signOut: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#mail-content">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link href="/inbox" className={styles.brand} aria-label="Agent Superhighway inbox">
          <HighwayMark />
          <span>
            Agent
            <br />
            Superhighway
          </span>
        </Link>
        <form action="/inbox" method="get" className={styles.search}>
          <Icon name="search" width={19} height={19} />
          <input
            name="q"
            type="search"
            aria-label="Search subjects and senders"
            placeholder="Search subjects and senders"
          />
        </form>
        <div className={styles.account}>
          <span title={email} className={styles.accountAvatar}>
            {email[0]?.toUpperCase()}
          </span>
          {signOut}
        </div>
      </header>
      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <MailNav unread={unread} pending={pending} />
          <div className={styles.address}>
            <span>Your highway address</span>
            <p>{address}</p>
            <CopyButton value={address} label="Copy address" />
          </div>
          <a href="/skill.md" className={styles.guide}>
            Agent connection guide <span>↗</span>
          </a>
        </aside>
        <main id="mail-content" className={styles.main}>
          <div className={styles.surface}>{children}</div>
        </main>
      </div>
    </div>
  );
}
