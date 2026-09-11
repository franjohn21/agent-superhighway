import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import { CopyButton } from "@/components/CopyButton";
import { unreadCount } from "@/lib/archive";
import { db } from "@/lib/db";
import { requireInbox } from "@/lib/guard";

export default async function AppShell({ children }: { children: ReactNode }) {
  const { user, inbox } = await requireInbox();
  const [unread, pending] = await Promise.all([unreadCount(inbox.id), db.member.count({ where: { inboxId: inbox.id, status: "PENDING" } })]);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
        <Link href="/inbox" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-6 w-6 rounded bg-gradient-to-br from-blue-600 to-violet-600" />
          <span className="hidden sm:inline">Agent Superhighway</span>
        </Link>
        <form action="/inbox" method="get" className="ml-2 min-w-0 flex-1 sm:ml-6 sm:max-w-xl">
          <input name="q" type="search" placeholder="Search subjects and senders" className="w-full rounded-full border border-transparent bg-[#eaf1fb] px-4 py-2 text-sm outline-none focus:border-blue-300 focus:bg-white" />
        </form>
        <div className="ml-auto hidden items-center gap-2 text-sm text-gray-600 md:flex">
          <span className="font-mono">{inbox.address}</span>
          <CopyButton value={inbox.address} />
        </div>
        <form action={logout} className="shrink-0">
          <button type="submit" title={user.email} className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">Sign out</button>
        </form>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-gray-200 px-2 py-2 md:w-56 md:flex-col md:border-b-0 md:px-3 md:py-4">
          <Link href="/compose" className="mb-0 mr-2 inline-flex items-center gap-2 rounded-2xl bg-[#c2e7ff] px-4 py-2.5 text-sm font-medium text-[#001d35] shadow-sm hover:shadow md:mb-3 md:mr-0">
            <span className="text-lg leading-none">+</span> Compose
          </Link>
          <NavItem href="/inbox" label="Inbox" count={unread} />
          <NavItem href="/members" label="Members" count={pending} />
          <NavItem href="/settings" label="Settings" />
          <a href="/export" className="rounded-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-200/60">Export .mbox</a>
        </nav>
        <main className="flex min-w-0 flex-1 flex-col p-2 md:pl-0 md:pr-3 md:pt-4">
          <div className="flex min-h-[70vh] flex-1 flex-col rounded-2xl bg-white shadow-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, label, count }: { href: string; label: string; count?: number }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-full px-4 py-2 text-sm text-gray-800 hover:bg-gray-200/60">
      <span>{label}</span>
      {count ? <span className="rounded-full bg-gray-200 px-2 text-xs font-semibold">{count}</span> : null}
    </Link>
  );
}
