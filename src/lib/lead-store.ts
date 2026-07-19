import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { sanitizeLeadProfileUpdate } from "./customer-card";
import { isLeadStage, normalizeLead } from "./lead-pipeline";
import type { Lead, LeadInput, LeadProfileUpdate, LeadStage } from "./types";

const localDataPath = path.join(process.cwd(), "data", "leads.json");
const MAX_LEADS = 2000;
let writeQueue = Promise.resolve();

function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_DATA_REPOSITORY;
  const branch = process.env.GITHUB_DATA_BRANCH ?? "main";
  const filePath = process.env.GITHUB_LEADS_PATH ?? "data/leads.json";
  return token && repository ? { token, repository, branch, filePath } : null;
}

async function readGithubLeads(config: NonNullable<ReturnType<typeof githubConfig>>) {
  const response = await fetch(`https://api.github.com/repos/${config.repository}/contents/${config.filePath}?ref=${config.branch}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${config.token}`, "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store",
  });
  if (response.status === 404) return { leads: [] as Lead[], sha: null as string | null };
  if (!response.ok) throw new Error(`GitHub talep okuma hatası: ${response.status}`);
  const payload = await response.json() as { content: string; sha: string };
  return { leads: JSON.parse(Buffer.from(payload.content, "base64").toString("utf8")) as Lead[], sha: payload.sha as string | null };
}

async function writeGithubLeads(config: NonNullable<ReturnType<typeof githubConfig>>, leads: Lead[], sha: string | null) {
  const response = await fetch(`https://api.github.com/repos/${config.repository}/contents/${config.filePath}`, {
    method: "PUT",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${config.token}`, "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
    body: JSON.stringify({ message: "Update customer leads", content: Buffer.from(`${JSON.stringify(leads, null, 2)}\n`).toString("base64"), ...(sha ? { sha } : {}), branch: config.branch }),
  });
  if (response.status === 409 || response.status === 422) throw new Error("LEAD_WRITE_CONFLICT");
  if (!response.ok) throw new Error(`GitHub talep yazma hatası: ${response.status}`);
}

async function readLocalLeads() {
  try { return JSON.parse(await readFile(localDataPath, "utf8")) as Lead[]; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}

async function writeLocalLeads(leads: Lead[]) {
  if (process.env.VERCEL) throw new Error("Vercel üzerinde kalıcı talep deposu yapılandırılmadı.");
  await mkdir(path.dirname(localDataPath), { recursive: true });
  const temporary = `${localDataPath}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(leads, null, 2)}\n`, "utf8");
  await rename(temporary, localDataPath);
}

async function readState() {
  const config = githubConfig();
  if (config) return readGithubLeads(config);
  return { leads: await readLocalLeads(), sha: null as string | null };
}

async function writeState(leads: Lead[], sha: string | null) {
  const normalized = leads.map(normalizeLead).slice(0, MAX_LEADS);
  const config = githubConfig();
  if (config) return writeGithubLeads(config, normalized, sha);
  return writeLocalLeads(normalized);
}

async function mutateLeads<T>(mutation: (leads: Lead[]) => T | Promise<T>): Promise<T> {
  let resolveResult!: (value: T) => void;
  let rejectResult!: (reason?: unknown) => void;
  const result = new Promise<T>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  writeQueue = writeQueue.then(async () => {
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const current = await readState();
        const leads = current.leads.map(normalizeLead);
        const value = await mutation(leads);
        try { await writeState(leads, current.sha); resolveResult(value); return; }
        catch (error) { if ((error as Error).message === "LEAD_WRITE_CONFLICT" && attempt < 2) continue; throw error; }
      }
    } catch (error) { rejectResult(error); }
  });
  return result;
}

export async function getLeads() {
  return (await readState()).leads.map(normalizeLead).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createLead(input: LeadInput) {
  return mutateLeads((leads) => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const digits = input.phone.replace(/\D/g, "");
    const duplicateIndex = leads.findIndex((lead) => lead.phone.replace(/\D/g, "") === digits && Date.parse(lead.createdAt) > dayAgo);
    const now = new Date().toISOString();
    const stage: LeadStage = isLeadStage(input.stage) ? input.stage : "Yeni";
    const lead = normalizeLead({
      ...input,
      id: duplicateIndex >= 0 ? leads[duplicateIndex].id : randomUUID(),
      stage,
      stageUpdatedAt: duplicateIndex >= 0 ? leads[duplicateIndex].stageUpdatedAt : now,
      stageHistory: duplicateIndex >= 0 ? leads[duplicateIndex].stageHistory : [{ stage, changedAt: now }],
      createdAt: duplicateIndex >= 0 ? leads[duplicateIndex].createdAt : now,
      updatedAt: now,
      listingReferences: [...new Set([...(duplicateIndex >= 0 ? leads[duplicateIndex].listingReferences : []), ...(input.listingReferences ?? [])])],
    });
    if (duplicateIndex >= 0) leads.splice(duplicateIndex, 1);
    leads.unshift(lead);
    if (leads.length > MAX_LEADS) leads.length = MAX_LEADS;
    return lead;
  });
}

export async function updateLeadStage(id: string, stage: LeadStage) {
  if (!isLeadStage(stage)) throw new Error("Geçersiz CRM durumu.");
  return mutateLeads((leads) => {
    const index = leads.findIndex((lead) => lead.id === id);
    if (index < 0) return null;
    const current = normalizeLead(leads[index]);
    if (current.stage === stage) return current;
    const changedAt = new Date().toISOString();
    const updated = normalizeLead({ ...current, stage, stageUpdatedAt: changedAt, stageHistory: [...current.stageHistory, { stage, changedAt }], updatedAt: changedAt });
    leads[index] = updated;
    return updated;
  });
}

export async function updateLeadProfile(id: string, input: LeadProfileUpdate) {
  const update = sanitizeLeadProfileUpdate(input);
  return mutateLeads((leads) => {
    const index = leads.findIndex((lead) => lead.id === id);
    if (index < 0) return null;
    const current = normalizeLead(leads[index]);
    const now = new Date().toISOString();
    const updated = normalizeLead({ ...current, ...update, id: current.id, createdAt: current.createdAt, updatedAt: now });
    leads[index] = updated;
    return updated;
  });
}

export async function deleteLead(id: string) {
  return mutateLeads((leads) => {
    const index = leads.findIndex((lead) => lead.id === id);
    if (index < 0) return false;
    leads.splice(index, 1);
    return true;
  });
}
