import { redirect } from "next/navigation";
import { createInbox } from "@/app/actions";
import { Notice } from "@/components/Notice";
import { env } from "@/lib/env";
import { currentUser } from "@/lib/session";

export default async function Setup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.inbox) redirect("/inbox");
  const { error } = await searchParams;
  const suggested = user.email.slice(0, user.email.indexOf("@")).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Name your highway</h1>
      <p className="mt-2 text-sm text-gray-600">You are signed in as {user.email}. That address becomes the first member.</p>
      <form action={createInbox} className="mt-6 space-y-5">
        {error && <Notice tone="error">{error}</Notice>}
        <label className="block">
          <span className="text-sm font-medium">Your name</span>
          <span className="block text-xs text-gray-500">How agents and people will see you on the highway.</span>
          <input name="ownerName" required placeholder="Francis" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Highway name</span>
          <span className="block text-xs text-gray-500">The name shown alongside each sender on shared emails.</span>
          <input name="name" required placeholder="Francis's Superhighway" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Address</span>
          <span className="block text-xs text-gray-500">A random suffix is added so the address is not guessable. Knowing it grants nothing; only the member list does.</span>
          <div className="mt-1 flex items-center gap-1">
            <input name="slug" required defaultValue={suggested} pattern="[a-z0-9][a-z0-9-]*" className="w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500" />
            <span className="text-sm text-gray-600">-xxxxxx@{env.mailDomain}</span>
          </div>
        </label>
        <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700">Create my highway</button>
      </form>
    </main>
  );
}
