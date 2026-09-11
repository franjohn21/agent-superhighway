"use client";

import { useEffect, useState } from "react";

/** Gmail-style timestamps: time today, weekday this week, else a date. Formatted in the viewer's timezone. */
export function When({ date, full = false }: { date: Date | string; full?: boolean }) {
  const value = typeof date === "string" ? new Date(date) : date;
  const [label, setLabel] = useState(() => value.toISOString().slice(0, 10));
  useEffect(() => {
    if (full) {
      setLabel(value.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }));
      return;
    }
    const now = new Date();
    const sameDay = value.toDateString() === now.toDateString();
    const ageDays = (now.getTime() - value.getTime()) / 86_400_000;
    if (sameDay) setLabel(value.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }));
    else if (ageDays < 6) setLabel(value.toLocaleDateString(undefined, { weekday: "short" }));
    else if (value.getFullYear() === now.getFullYear()) setLabel(value.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    else setLabel(value.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }));
  }, [full, value]);
  return (
    <time dateTime={value.toISOString()} title={value.toLocaleString()} suppressHydrationWarning>
      {label}
    </time>
  );
}
