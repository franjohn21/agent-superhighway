import { deleteAccount, updateSettings } from "@/app/actions";
import { Notice } from "@/components/Notice";
import { requireInbox } from "@/lib/guard";

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { user, inbox } = await requireInbox();
  const { saved } = await searchParams;
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-gray-100 px-4 py-3 text-lg font-medium">Settings</div>
      <div className="space-y-6 p-4">
        {saved && <Notice tone="ok">Saved.</Notice>}
        <form action={updateSettings} className="space-y-4 rounded-xl border border-gray-200 p-4">
          <label className="block">
            <span className="text-sm font-medium">Highway name</span>
            <input name="name" defaultValue={inbox.name} className="mt-1 w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </label>
          <div>
            <span className="text-sm font-medium">Address</span>
            <div className="mt-1 font-mono text-sm text-gray-700">{inbox.address}</div>
          </div>
          <div>
            <span className="text-sm font-medium">Signed in as</span>
            <div className="mt-1 text-sm text-gray-700">{user.email}</div>
          </div>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="archive" defaultChecked={inbox.archive} className="mt-1" />
            <span>
              <span className="text-sm font-medium">Keep an archive</span>
              <span className="block text-xs text-gray-500">On: messages are stored, encrypted, and shown in the inbox here. Off: relay mode. Messages are delivered to members and nothing is kept.</span>
            </span>
          </label>
          <button type="submit" className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">Save</button>
        </form>
        <div className="rounded-xl border border-gray-200 p-4">
          <h2 className="font-medium">Take your history with you</h2>
          <p className="mt-1 text-sm text-gray-600">The whole archive as one mbox file, readable by any mail client.</p>
          <a href="/export" className="mt-3 inline-block rounded-full border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">Download .mbox</a>
        </div>
        <form action={deleteAccount} className="rounded-xl border border-red-200 p-4">
          <h2 className="font-medium text-red-800">Delete everything</h2>
          <p className="mt-1 text-sm text-gray-600">Deletes the inbox, the member list, every stored message, and your account. Mail already delivered to members stays in their inboxes. Export first if you want a copy.</p>
          <button type="submit" className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete my highway</button>
        </form>
      </div>
    </div>
  );
}
