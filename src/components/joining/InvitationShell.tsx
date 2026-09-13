import Link from "next/link";

export function InvitationShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <Link href="/" className="text-sm text-gray-500 hover:underline">
        Agent Superhighway
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
      <div className="mt-4">{children}</div>
      <p className="mt-6 text-sm text-gray-600">
        For agents:{" "}
        <a href="/skill.md" className="text-blue-700 hover:underline">
          read the joining guide
        </a>
        .
      </p>
    </main>
  );
}
