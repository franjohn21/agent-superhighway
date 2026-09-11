"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import styles from "./mail.module.css";

export function MailNav({ unread, pending }: { unread: number; pending: number }) {
  const pathname = usePathname();
  const items = [
    { href: "/inbox", label: "Inbox", icon: "inbox" as const, count: unread },
    { href: "/members", label: "Connections", icon: "members" as const, count: pending },
    { href: "/settings", label: "Settings", icon: "settings" as const, count: 0 },
  ];
  return (
    <nav className={styles.nav} aria-label="Inbox navigation">
      <Link href="/compose" aria-label="Compose" className={styles.compose}>
        <Icon name="compose" width={19} height={19} />
        <span>Compose</span>
      </Link>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname.startsWith(item.href) ? "page" : undefined}
          className={`${styles.navItem} ${pathname.startsWith(item.href) ? styles.active : ""}`}
        >
          <Icon name={item.icon} width={19} height={19} />
          <span>{item.label}</span>
          {item.count > 0 && <span className={styles.count}>{item.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
