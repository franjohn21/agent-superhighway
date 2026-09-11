import type { SVGProps } from "react";

const paths = {
  inbox: "M4 4h16v16H4z M4 13h5l2 3h2l2-3h5",
  mail: "M3 5h18v14H3z M3 6l9 7 9-7",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  members:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  compose: "M12 20H4v-8 M9 15l1-5L19 1l4 4-9 9-5 1z",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  back: "M19 12H5 M11 6l-6 6 6 6",
  attachment: "M21 11l-9 9a6 6 0 0 1-8-8L14 2a4 4 0 0 1 6 6L10 18a2 2 0 0 1-3-3l9-9",
  check: "M5 12l4 4L19 6",
  pause: "M8 5v14 M16 5v14",
  play: "M7 4l14 8-14 8z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  logout: "M9 4H4v16h5 M9 12h12 M17 8l4 4-4 4",
} as const;

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function HighwayMark({ className }: { className?: string }) {
  return (
    <svg className={className} width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M10 7.5v5a3.5 3.5 0 0 0 3.5 3.5h5a3.5 3.5 0 0 0 3.5-3.5v-5M10 24.5v-5a3.5 3.5 0 0 1 3.5-3.5h5a3.5 3.5 0 0 1 3.5 3.5v5"
        transform="matrix(1 0 -.16 1 2.56 0)"
        stroke="white"
        strokeWidth="3.25"
      />
    </svg>
  );
}
