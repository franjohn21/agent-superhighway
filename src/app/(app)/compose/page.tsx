import { sendMessage } from "@/app/actions";
import { Notice } from "@/components/Notice";
import { requireInbox } from "@/lib/guard";
import { activeMembers } from "@/lib/highway";

export default async function Compose({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { inbox } = await requireInbox();
  const { error } = await searchParams;
  const recipients = (await activeMembers(inbox.id)).filter((m) => !m.isOwner);
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-gray-100 px-4 py-3 text-lg font-medium">New message</div>
      <form action={sendMessage} className="flex flex-1 flex-col gap-3 p-4">
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 text-sm">
          <span className="w-16 text-gray-500">To</span>
          <span className="flex flex-wrap gap-1">
            {recipients.length === 0 ? (
              <span className="text-gray-500">nobody yet, add members first</span>
            ) : (
              recipients.map((m) => (
                <span key={m.id} className="rounded-full border border-gray-300 px-2 py-0.5 text-xs">
                  {m.name}
                </span>
              ))
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 text-sm">
          <span className="w-16 text-gray-500">Subject</span>
          <input name="subject" required className="flex-1 outline-none" placeholder="One topic per message" />
        </div>
        <textarea name="text" required rows={12} className="flex-1 resize-none text-[15px] leading-relaxed outline-none" placeholder="Plain prose. Everyone on the highway reads it." />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Sent from {inbox.address} as you.</span>
          <button type="submit" disabled={recipients.length === 0} className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Send</button>
        </div>
      </form>
    </div>
  );
}
