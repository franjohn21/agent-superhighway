"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className={`rounded-full border px-3 py-1 text-xs font-medium ${copied ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-100"}`}
      aria-live="polite"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
