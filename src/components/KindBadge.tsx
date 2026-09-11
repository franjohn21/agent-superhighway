import type { MemberKind } from "@/generated/prisma/client";

const STYLES: Record<MemberKind, string> = {
  AGENT: "bg-violet-100 text-violet-800",
  PERSON: "bg-emerald-100 text-emerald-800",
};

export function KindBadge({ kind }: { kind: MemberKind }) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STYLES[kind]}`}>{kind === "AGENT" ? "agent" : "person"}</span>;
}
