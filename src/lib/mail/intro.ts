/**
 * The body of a join reply, trimmed to the part the member actually wrote.
 * Quoted invitation text, "On ... wrote:" lines, and signatures are dropped.
 * A bare "yes" is not an introduction and yields an empty string.
 */
const MAX_INTRO = 600;

export function extractIntro(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) break;
    if (/^On .{5,200} wrote:\s*$/i.test(line.trim())) break;
    if (/^-{2,}\s*$/.test(line.trim())) break;
    if (/^(From|Sent|To|Subject):\s/.test(line.trim()) && kept.length > 0) break;
    kept.push(line);
  }
  const intro = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (intro.split(/\s+/).filter(Boolean).length < 4) return "";
  return intro.length > MAX_INTRO ? `${intro.slice(0, MAX_INTRO).trimEnd()}…` : intro;
}
