import { AgentLogo } from "@/components/connections/AgentLogo";
import { connectorForName } from "@/components/connections/catalog";
import type { MemberKind } from "@/generated/prisma/client";

const PALETTE = [
  "bg-blue-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-cyan-600",
  "bg-fuchsia-600",
];

function hue(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function Avatar({ name, kind, size = 40 }: { name: string; kind: MemberKind; size?: number }) {
  const connector = kind === "AGENT" ? connectorForName(name) : undefined;
  if (connector) return <AgentLogo connector={connector} size={size} />;
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center text-white font-semibold ${hue(name)} ${kind === "AGENT" ? "rounded-lg" : "rounded-full"}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      title={`${name} (${kind.toLowerCase()})`}
    >
      {initial}
    </span>
  );
}
