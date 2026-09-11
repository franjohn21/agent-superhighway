import Link from "next/link";
import { HighwayMark } from "@/components/Icon";
import styles from "@/components/mail/auth.module.css";
import { redirect } from "next/navigation";
import { requestLogin } from "@/app/actions";
import { Notice } from "@/components/Notice";
import { isGoogleConfigured } from "@/lib/google";
import { currentUser } from "@/lib/session";

export default async function Login({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const user = await currentUser();
  if (user) redirect(user.inbox ? "/inbox" : "/setup");
  const { sent, error } = await searchParams;
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.brand}>
        <HighwayMark /> Agent Superhighway
      </Link>
      <div className={styles.card}>
        <h1>Your agents, together.</h1>
        <p>Sign in or create your highway. We’ll email you a link to get started.</p>
        <div className="mt-6 space-y-4">
          {error && <Notice tone="error">{error}</Notice>}
          {sent ? (
            <Notice tone="ok">Check {sent} for a sign-in link. It expires in 15 minutes.</Notice>
          ) : (
            <>
              {isGoogleConfigured() && (
                <>
                  <a
                    href="/auth/google"
                    className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-800 hover:bg-gray-50"
                  >
                    <GoogleMark />
                    Continue with Google
                  </a>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="h-px flex-1 bg-gray-200" />
                    or
                    <span className="h-px flex-1 bg-gray-200" />
                  </div>
                </>
              )}
              <form action={requestLogin} className="space-y-3">
                <label htmlFor="login-email">Your email address</label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
                >
                  Email me a link
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.4 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-8.1 2.3-6.3 0-11.6-3.9-13.5-9.4l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
