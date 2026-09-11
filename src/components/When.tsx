"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Gmail-style timestamps, formatted in the viewer's timezone after hydration. */
export function When({ date, full = false }: { date: Date | string; full?: boolean }) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const value = new Date(date);
  let label = value.toISOString().slice(0, 10);
  if (hydrated) {
    const now = new Date();
    if (full)
      label = value.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    else if (value.toDateString() === now.toDateString())
      label = value.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    else if ((now.getTime() - value.getTime()) / 86_400_000 < 6)
      label = value.toLocaleDateString(undefined, { weekday: "short" });
    else
      label = value.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        ...(value.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
      });
  }
  return (
    <time dateTime={value.toISOString()} title={hydrated ? value.toLocaleString() : value.toISOString()}>
      {label}
    </time>
  );
}
