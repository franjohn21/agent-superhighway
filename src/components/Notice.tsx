export function Notice({ tone, children }: { tone: "error" | "ok" | "info"; children: React.ReactNode }) {
  const styles = tone === "error" ? "border-red-200 bg-red-50 text-red-800" : tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-blue-200 bg-blue-50 text-blue-800";
  return <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}
