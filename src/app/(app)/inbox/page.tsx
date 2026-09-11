import Link from "next/link";
import { KindBadge } from "@/components/KindBadge";
import { When } from "@/components/When";
import { listThreads } from "@/lib/archive";
import { db } from "@/lib/db";
import { requireInbox } from "@/lib/guard";

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { inbox } = await requireInbox();
  const { q = "" } = await searchParams;
  const [threads, memberCount] = await Promise.all([listThreads(inbox, q), db.member.count({ where: { inboxId: inbox.id, status: "ACTIVE" } })]);
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 text-xs text-gray-500">
        <span>{q ? `Results for "${q}"` : inbox.name}</span>
        <span>{threads.length} {threads.length === 1 ? "thread" : "threads"}</span>
      </div>
      {threads.length === 0 ? (
        <Empty query={q} memberCount={memberCount} address={inbox.address} archive={inbox.archive} />
      ) : (
        <ul className="divide-y divide-gray-100">
          {threads.map((t) => (
            <li key={t.threadId}>
              <Link href={`/inbox/${t.threadId}`} className={`block px-4 py-3 hover:shadow-[inset_0_-1px_0_#e5e7eb,0_1px_3px_rgba(0,0,0,.12)] ${t.unread ? "bg-white" : "bg-gray-50/70"}`}>
                <div className="flex items-center gap-3">
                  <div className={`min-w-0 flex-1 truncate text-sm sm:w-44 sm:flex-none ${t.unread ? "font-semibold" : "text-gray-700"}`}>
                    {t.participants.map((p) => p.name).join(", ")}
                    {t.count > 1 && <span className="ml-1 text-xs font-normal text-gray-500">{t.count}</span>}
                  </div>
                  <div className="hidden min-w-0 flex-1 truncate text-sm sm:block">
                    <span className={t.unread ? "font-semibold" : ""}>{t.subject}</span>
                    <span className="text-gray-500"> – {t.snippet}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.participants.some((p) => p.kind === "AGENT") && <KindBadge kind="AGENT" />}
                    {t.hasAttachments && <span title="Has attachments" className="text-gray-400">📎</span>}
                    <span className={`text-xs sm:w-14 sm:text-right ${t.unread ? "font-semibold" : "text-gray-500"}`}>
                      <When date={t.lastAt} />
                    </span>
                  </div>
                </div>
                <div className="mt-0.5 line-clamp-2 text-sm sm:hidden">
                  <span className={t.unread ? "font-semibold" : ""}>{t.subject}</span>
                  <span className="text-gray-500"> – {t.snippet}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Empty({ query, memberCount, address, archive }: { query: string; memberCount: number; address: string; archive: boolean }) {
  if (query) return <p className="p-10 text-center text-sm text-gray-500">Nothing matches. Search covers subjects and senders; message bodies stay sealed.</p>;
  if (!archive) return <p className="p-10 text-center text-sm text-gray-500">Relay mode is on. Messages are delivered and not kept. Turn the archive on in Settings to see them here.</p>;
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
      <p className="text-lg font-medium">Nothing on the highway yet.</p>
      {memberCount < 2 ? (
        <p className="mt-2 max-w-md text-sm text-gray-600">
          <Link href="/members" className="text-blue-700 hover:underline">Add an agent</Link> to get started. Once it replies to the invitation, anything it sends to <span className="font-mono">{address}</span> lands here and reaches everyone else.
        </p>
      ) : (
        <p className="mt-2 max-w-md text-sm text-gray-600">
          Send something to <span className="font-mono">{address}</span> from your own email, or <Link href="/compose" className="text-blue-700 hover:underline">compose</Link> here.
        </p>
      )}
    </div>
  );
}
