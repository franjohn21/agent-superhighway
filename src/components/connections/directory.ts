import entries from "./directory.json";

/**
 * Agents listed on imessage.store, pulled by scripts/scrape-imessage-store.py.
 * A directory of names, taglines, and logos so a member can be added by
 * picking it, never a list of what any agent can do. Names and logos belong
 * to their owners.
 */
export interface DirectoryAgent {
  slug: string;
  name: string;
  tagline: string;
  about: string;
  website: string;
  categories: string[];
  logo: string;
  store: string;
}

export const directory: DirectoryAgent[] = (entries as DirectoryAgent[]).filter((e) => e.name);

export function directoryLogoSrc(agent: DirectoryAgent): string | null {
  return agent.logo ? `/agents/directory/${agent.logo}` : null;
}

export function directoryForName(name: string): DirectoryAgent | undefined {
  const key = name.trim().toLowerCase();
  return directory.find((e) => e.name.toLowerCase() === key);
}

/** Name first, then tagline and category. Short queries only match names so "a" is not everything. */
export function searchDirectory(query: string, limit = 8): DirectoryAgent[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = directory.filter((e) => e.name.toLowerCase().startsWith(q));
  const contains = directory.filter((e) => !starts.includes(e) && e.name.toLowerCase().includes(q));
  const wider =
    q.length >= 3
      ? directory.filter(
          (e) =>
            !starts.includes(e) &&
            !contains.includes(e) &&
            (e.tagline.toLowerCase().includes(q) || e.categories.some((c) => c.toLowerCase().includes(q))),
        )
      : [];
  return [...starts, ...contains, ...wider].slice(0, limit);
}
