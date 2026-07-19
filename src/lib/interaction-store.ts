import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CustomerInteraction, CustomerInteractionInput, InteractionType } from "./types";

const localDataPath = path.join(process.cwd(), "data", "interactions.json");
const TYPES: InteractionType[] = ["Arama", "WhatsApp", "Not", "Randevu", "E-posta"];
const MAX_INTERACTIONS = 10000;
let writeQueue = Promise.resolve();

function clean(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function safeIso(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
}

export function sanitizeInteractionInput(value: unknown): CustomerInteractionInput {
  const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const type = TYPES.includes(body.type as InteractionType) ? body.type as InteractionType : "Not";
  return {
    leadId: clean(body.leadId, 80),
    type,
    summary: clean(body.summary, 1200),
    outcome: clean(body.outcome, 500),
    nextActionAt: safeIso(body.nextActionAt),
    createdBy: clean(body.createdBy, 80) || "Admin",
  };
}

function normalizeInteraction(value: Partial<CustomerInteraction>): CustomerInteraction {
  const createdAt = safeIso(value.createdAt) || new Date(0).toISOString();
  return {
    id: clean(value.id, 80),
    leadId: clean(value.leadId, 80),
    type: TYPES.includes(value.type as InteractionType) ? value.type as InteractionType : "Not",
    summary: clean(value.summary, 1200),
    outcome: clean(value.outcome, 500),
    nextActionAt: safeIso(value.nextActionAt),
    createdBy: clean(value.createdBy, 80) || "Admin",
    createdAt,
  };
}

function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_DATA_REPOSITORY;
  const branch = process.env.GITHUB_DATA_BRANCH ?? "main";
  const filePath = process.env.GITHUB_INTERACTIONS_PATH ?? "data/interactions.json";
  return token && repository ? { token, repository, branch, filePath } : null;
}

async function readGithub(config: NonNullable<ReturnType<typeof githubConfig>>) {
  const response = await fetch(`https://api.github.com/repos/${config.repository}/contents/${config.filePath}?ref=${config.branch}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${config.token}`, "X-GitHub-Api-Version": "2022-11-28" }, cache: "no-store",
  });
  if (response.status === 404) return { items: [] as CustomerInteraction[], sha: null as string | null };
  if (!response.ok) throw new Error(`GitHub iletişim kaydı okuma hatası: ${response.status}`);
  const payload = await response.json() as { content: string; sha: string };
  return { items: (JSON.parse(Buffer.from(payload.content, "base64").toString("utf8")) as CustomerInteraction[]).map(normalizeInteraction), sha: payload.sha };
}

async function writeGithub(config: NonNullable<ReturnType<typeof githubConfig>>, items: CustomerInteraction[], sha: string | null) {
  const response = await fetch(`https://api.github.com/repos/${config.repository}/contents/${config.filePath}`, {
    method: "PUT",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${config.token}`, "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
    body: JSON.stringify({ message: "Update customer interactions", content: Buffer.from(`${JSON.stringify(items, null, 2)}\n`).toString("base64"), ...(sha ? { sha } : {}), branch: config.branch }),
  });
  if (response.status === 409 || response.status === 422) throw new Error("INTERACTION_WRITE_CONFLICT");
  if (!response.ok) throw new Error(`GitHub iletişim kaydı yazma hatası: ${response.status}`);
}

async function readLocal() {
  try { return (JSON.parse(await readFile(localDataPath, "utf8")) as CustomerInteraction[]).map(normalizeInteraction); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}

async function writeLocal(items: CustomerInteraction[]) {
  if (process.env.VERCEL) throw new Error("Vercel üzerinde kalıcı iletişim geçmişi deposu yapılandırılmadı.");
  await mkdir(path.dirname(localDataPath), { recursive: true });
  const temporary = `${localDataPath}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  await rename(temporary, localDataPath);
}

async function readState() {
  const config = githubConfig();
  return config ? readGithub(config) : { items: await readLocal(), sha: null as string | null };
}

async function writeState(items: CustomerInteraction[], sha: string | null) {
  const normalized = items.map(normalizeInteraction).slice(0, MAX_INTERACTIONS);
  const config = githubConfig();
  if (config) return writeGithub(config, normalized, sha);
  return writeLocal(normalized);
}

async function mutate<T>(operation: (items: CustomerInteraction[]) => T | Promise<T>) {
  let resolveResult!: (value: T) => void;
  let rejectResult!: (reason?: unknown) => void;
  const result = new Promise<T>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  writeQueue = writeQueue.then(async () => {
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const current = await readState();
        const items = current.items.map(normalizeInteraction);
        const value = await operation(items);
        try { await writeState(items, current.sha); resolveResult(value); return; }
        catch (error) { if ((error as Error).message === "INTERACTION_WRITE_CONFLICT" && attempt < 2) continue; throw error; }
      }
    } catch (error) { rejectResult(error); }
  });
  return result;
}

export async function getInteractions(leadId?: string) {
  const items = (await readState()).items.map(normalizeInteraction).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return leadId ? items.filter((item) => item.leadId === leadId) : items;
}

export async function createInteraction(value: CustomerInteractionInput) {
  const input = sanitizeInteractionInput(value);
  if (!input.leadId || !input.summary) throw new Error("Müşteri ve görüşme özeti zorunludur.");
  return mutate((items) => {
    const item: CustomerInteraction = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    items.unshift(item);
    if (items.length > MAX_INTERACTIONS) items.length = MAX_INTERACTIONS;
    return item;
  });
}

export async function deleteInteraction(id: string) {
  return mutate((items) => {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return false;
    items.splice(index, 1);
    return true;
  });
}
