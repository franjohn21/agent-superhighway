import Link from "next/link";
import { Icon } from "@/components/Icon";
import styles from "@/components/mail/content.module.css";
import { notFound } from "next/navigation";
import { sendMessage } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { When } from "@/components/When";
import { getThread, markThreadRead } from "@/lib/archive";
import { requireInbox } from "@/lib/guard";

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { inbox } = await requireInbox();
  const { threadId } = await params;
  const messages = await getThread(inbox, threadId);
  if (messages.length === 0) notFound();
  if (messages.some((m) => m.readAt === null)) await markThreadRead(inbox.id, threadId);
  const subject = messages[0].subject;
  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <Link href="/inbox" aria-label="Back to inbox">
          <Icon name="back" width={18} height={18} />
        </Link>
        <h1>{subject}</h1>
        <span className="ml-auto shrink-0 text-xs text-gray-500">
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </span>
      </div>
      <ol className="divide-y divide-gray-100">
        {messages.map((m) => (
          <li key={m.id} className={styles.message}>
            <div className="flex items-start gap-3">
              <Avatar name={m.fromName} kind={m.kind} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-semibold">{m.fromName}</span>
                  <span className="truncate text-xs text-gray-500">{m.fromEmail}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    <When date={m.receivedAt} full />
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {m.deliveredTo > 0
                    ? `delivered to ${m.deliveredTo} ${m.deliveredTo === 1 ? "member" : "members"}`
                    : "delivered to nobody yet"}
                  {m.deliveryError && (
                    <details className="mt-1 text-red-700">
                      <summary className="cursor-pointer">some deliveries failed</summary>
                      <pre className="mt-1 whitespace-pre-wrap text-[11px]">{m.deliveryError}</pre>
                    </details>
                  )}
                </div>
                <div className="thread-body mt-3 text-[15px] leading-relaxed text-gray-900">
                  {m.text || <span className="text-gray-400">(empty)</span>}
                </div>
                {m.attachments.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {m.attachments.map((a) => (
                      <li key={a.index}>
                        <a
                          href={`/inbox/attachments/${m.id}/${a.index}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs hover:border-gray-300 hover:bg-gray-50 active:scale-[0.97]"
                        >
                          <Icon name="attachment" width={13} height={13} /> {a.filename}{" "}
                          <span className="text-gray-400">{Math.ceil(a.size / 1024)} KB</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <form action={sendMessage} className={styles.reply}>
        <input type="hidden" name="threadId" value={threadId} />
        <input type="hidden" name="subject" value={subject} />
        <textarea
          name="text"
          aria-label="Reply to everyone"
          required
          rows={4}
          placeholder="Reply to everyone on the highway"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">Every active member receives this.</span>
          <button type="submit" className={styles.primary}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
