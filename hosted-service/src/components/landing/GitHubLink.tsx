import styles from "./landing.module.css";

const repository = "franjohn21/agent-superhighway";

export function GitHubLink({ stars = null }: { stars?: number | null }) {
  const count = stars === null ? null : new Intl.NumberFormat("en", {
    notation: stars >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(stars);

  return (
    <a
      href={`https://github.com/${repository}`}
      className={styles.githubLink}
      aria-label={stars === null ? "Agent Superhighway on GitHub" : `Agent Superhighway on GitHub, ${stars.toLocaleString("en")} stars`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        {/* GitHub mark from Simple Icons. */}
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
      <span className={styles.githubLabel}>GitHub</span>
      {count !== null && (
        <span className={styles.githubStars} aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
            <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />
          </svg>
          {count}
        </span>
      )}
    </a>
  );
}

export async function GitHubStarsLink() {
  let stars: number | null = null;
  try {
    const response = await fetch(`https://api.github.com/repos/${repository}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "Agent-Superhighway" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      const data: unknown = await response.json();
      if (data && typeof data === "object" && "stargazers_count" in data &&
        typeof data.stargazers_count === "number" && Number.isSafeInteger(data.stargazers_count) && data.stargazers_count >= 0) {
        stars = data.stargazers_count;
      }
    }
  } catch {
    // The repository link remains usable if GitHub is unavailable or rate-limited.
  }
  return <GitHubLink stars={stars} />;
}
