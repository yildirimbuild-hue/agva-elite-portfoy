import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const filePath = path.join(process.cwd(), "data", "audit-log.json");
const MAX_EVENTS = 1000;

export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  requestId: string;
  createdAt: string;
  previousHash: string;
  hash: string;
};

async function readEvents(): Promise<AuditEvent[]> {
  try { return JSON.parse(await readFile(filePath, "utf8")) as AuditEvent[]; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}

export async function getAuditEvents(limit = 100) {
  const safeLimit = Math.max(1, Math.min(limit, MAX_EVENTS));
  return (await readEvents()).slice(-safeLimit).reverse();
}

export async function appendAuditEvent(input: Omit<AuditEvent, "id" | "createdAt" | "previousHash" | "hash">) {
  if (process.env.VERCEL) return;
  const events = await readEvents();
  const previousHash = events.at(-1)?.hash ?? "GENESIS";
  const base = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), previousHash };
  const event: AuditEvent = { ...base, hash: createHash("sha256").update(JSON.stringify(base)).digest("hex") };
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify([...events, event].slice(-MAX_EVENTS), null, 2)}\n`, "utf8");
  await rename(temporary, filePath);
}
