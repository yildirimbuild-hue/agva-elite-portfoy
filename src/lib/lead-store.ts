import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Lead, LeadInput } from "./types";

const localDataPath = path.join(process.cwd(), "data", "leads.json");
const MAX_LEADS = 200;

function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_DATA_REPOSITORY;
  const branch = process.env.GITHUB_DATA_BRANCH ?? "main";
  const filePath = process.env.GITHUB_LEADS_PATH ?? "data/leads.json";
  return token && repository ? { token, repository, branch, filePath } : null;
}

async function readGithubLeads(config: NonNullable<ReturnType<typeof githubConfig>>) {
  const response = await fetch(
    `https://api.github.com/repos/${config.repository}/contents/${config.filePath}?ref=${config.branch}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    },
  );
  if (response.status === 404) return { leads: [] as Lead[], sha: null };
  if (!response.ok) throw new Error(`GitHub talep okuma hatası: ${response.status}`);
  const payload = (await response.json()) as { content: string; sha: string };
  return { leads: JSON.parse(Buffer.from(payload.content, "base64").toString("utf8")) as Lead[], sha: payload.sha as string | null };
}

async function writeGithubLeads(config: NonNullable<ReturnType<typeof githubConfig>>, leads: Lead[]) {
  const current = await readGithubLeads(config);
  const response = await fetch(`https://api.github.com/repos/${config.repository}/contents/${config.filePath}`, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      message: "Update customer leads",
      content: Buffer.from(`${JSON.stringify(leads, null, 2)}\n`).toString("base64"),
      ...(current.sha ? { sha: current.sha } : {}),
      branch: config.branch,
    }),
  });
  if (!response.ok) throw new Error(`GitHub talep yazma hatası: ${response.status}`);
}

async function readLocalLeads() {
  try {
    return JSON.parse(await readFile(localDataPath, "utf8")) as Lead[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeLocalLeads(leads: Lead[]) {
  if (process.env.VERCEL) {
    throw new Error("Vercel üzerinde kalıcı talep deposu yapılandırılmadı.");
  }
  await mkdir(path.dirname(localDataPath), { recursive: true });
  const temporary = `${localDataPath}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(leads, null, 2)}\n`, "utf8");
  await rename(temporary, localDataPath);
}

export async function getLeads() {
  const config = githubConfig();
  const leads = config ? (await readGithubLeads(config)).leads : await readLocalLeads();
  return leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function saveLeads(leads: Lead[]) {
  const config = githubConfig();
  if (config) return writeGithubLeads(config, leads);
  return writeLocalLeads(leads);
}

export async function createLead(input: LeadInput) {
  const leads = await getLeads();
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const digits = input.phone.replace(/\D/g, "");
  const remaining = leads.filter((lead) => !(lead.phone.replace(/\D/g, "") === digits && Date.parse(lead.createdAt) > dayAgo));
  const lead: Lead = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  await saveLeads([lead, ...remaining].slice(0, MAX_LEADS));
  return lead;
}

export async function deleteLead(id: string) {
  const leads = await getLeads();
  const next = leads.filter((lead) => lead.id !== id);
  if (next.length === leads.length) return false;
  await saveLeads(next);
  return true;
}
