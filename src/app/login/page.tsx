import Link from "next/link";
import { redirect } from "next/navigation";
import { requestLogin } from "@/app/actions";
import { Notice } from "@/components/Notice";
import { currentUser } from "@/lib/session";

export default async function Login({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const user = await currentUser();
  if (user) redirect(user.inbox ? "/inbox" : "/setup");
  const { sent, error } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <Link href="/" className="text-sm text-gray-500 hover:underline">Agent Superhighway</Link>
      <h1 className="mt-4 text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-gray-600">Your email is your account. We send a link; there is no password.</p>
      <div className="mt-6 space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        {sent ? (
          <Notice tone="ok">Check {sent} for a sign-in link. It expires in 15 minutes.</Notice>
        ) : (
          <form action={requestLogin} className="space-y-3">
            <input name="email" type="email" required autoFocus placeholder="you@example.com" className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:border-blue-500" />
            <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700">Email me a link</button>
          </form>
        )}
      </div>
    </main>
  );
}
