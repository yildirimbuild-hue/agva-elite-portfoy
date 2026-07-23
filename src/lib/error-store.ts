import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const filePath = path.join(process.cwd(), "data", "error-events.json");
const MAX_EVENTS = 300;

export type ErrorEvent = { id: string; fingerprint: string; source: string; message: string; severity: "warning" | "error" | "critical"; firstSeenAt: string; lastSeenAt: string; occurrenceCount: number; resolved: boolean };

function safeMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/sk-[A-Za-z0-9_-]+/g, "[API_KEY]").replace(/\+?\d[\d\s()-]{8,}/g, "[PHONE]").slice(0, 400);
}

export async function getErrorEvents(limit = 100) {
  const safeLimit = Math.max(1, Math.min(limit, MAX_EVENTS));
  try {
    const events = JSON.parse(await readFile(filePath, "utf8")) as ErrorEvent[];
    return events
      .sort((a, b) => Number(a.resolved) - Number(b.resolved) || b.lastSeenAt.localeCompare(a.lastSeenAt))
      .slice(0, safeLimit);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function recordError(source: string, error: unknown, severity: ErrorEvent["severity"] = "error") {
  if (process.env.VERCEL) return;
  const message = safeMessage(error);
  const fingerprint = createHash("sha1").update(`${source}:${message}`).digest("hex");
  let events: ErrorEvent[] = [];
  try { events = JSON.parse(await readFile(filePath, "utf8")) as ErrorEvent[]; }
  catch (readError) { if ((readError as NodeJS.ErrnoException).code !== "ENOENT") return; }
  const now = new Date().toISOString();
  const existing = events.find((event) => event.fingerprint === fingerprint && !event.resolved);
  if (existing) { existing.lastSeenAt = now; existing.occurrenceCount += 1; }
  else events.push({ id: randomUUID(), fingerprint, source, message, severity, firstSeenAt: now, lastSeenAt: now, occurrenceCount: 1, resolved: false });
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(events.slice(-MAX_EVENTS), null, 2)}\n`, "utf8");
  await rename(temporary, filePath);
}
