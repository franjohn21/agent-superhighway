import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const skill = await readFile(path.join(process.cwd(), "SKILL.md"), "utf8");
  return new Response(skill, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
