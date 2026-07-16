import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Listing, ListingInput } from "./types";

const localDataPath = path.join(process.cwd(), "data", "listings.json");

function normalizeListing(listing: Listing): Listing {
  return { ...listing, oldPrice: listing.oldPrice ?? 0, urgent: listing.urgent ?? false };
}

function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_DATA_REPOSITORY;
  const branch = process.env.GITHUB_DATA_BRANCH ?? "main";
  const filePath = process.env.GITHUB_DATA_PATH ?? "data/listings.json";
  return token && repository ? { token, repository, branch, filePath } : null;
}

async function readGithubListings(config: NonNullable<ReturnType<typeof githubConfig>>) {
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
  if (!response.ok) throw new Error(`GitHub veri okuma hatası: ${response.status}`);
  const payload = (await response.json()) as { content: string; sha: string };
  return { listings: JSON.parse(Buffer.from(payload.content, "base64").toString("utf8")) as Listing[], sha: payload.sha };
}

async function writeGithubListings(config: NonNullable<ReturnType<typeof githubConfig>>, listings: Listing[]) {
  const current = await readGithubListings(config);
  const response = await fetch(`https://api.github.com/repos/${config.repository}/contents/${config.filePath}`, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      message: "Update real estate portfolio",
      content: Buffer.from(`${JSON.stringify(listings, null, 2)}\n`).toString("base64"),
      sha: current.sha,
      branch: config.branch,
    }),
  });
  if (!response.ok) throw new Error(`GitHub veri yazma hatası: ${response.status}`);
}

async function readLocalListings() {
  try {
    return JSON.parse(await readFile(localDataPath, "utf8")) as Listing[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeLocalListings(listings: Listing[]) {
  await mkdir(path.dirname(localDataPath), { recursive: true });
  const temporary = `${localDataPath}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(listings, null, 2)}\n`, "utf8");
  await rename(temporary, localDataPath);
}

export async function getListings(options: { includeDrafts?: boolean } = {}) {
  const config = githubConfig();
  const listings = (config ? (await readGithubListings(config)).listings : await readLocalListings()).map(normalizeListing);
  const visible = options.includeDrafts ? listings : listings.filter((item) => item.published);
  return visible.sort((a, b) => Number(b.featured) - Number(a.featured) || b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveListings(listings: Listing[]) {
  const config = githubConfig();
  if (config) return writeGithubListings(config, listings);
  return writeLocalListings(listings);
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createListing(input: ListingInput) {
  const listings = await getListings({ includeDrafts: true });
  const now = new Date().toISOString();
  const listing: Listing = {
    ...input,
    oldPrice: input.oldPrice ?? 0,
    urgent: input.urgent ?? false,
    id: randomUUID(),
    reference: `IKS-${String(listings.length + 1).padStart(4, "0")}`,
    slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
    createdAt: now,
    updatedAt: now,
  };
  await saveListings([listing, ...listings]);
  return listing;
}

export async function updateListing(id: string, input: Partial<ListingInput>) {
  const listings = await getListings({ includeDrafts: true });
  const index = listings.findIndex((item) => item.id === id);
  if (index < 0) return null;
  listings[index] = { ...listings[index], ...input, id, updatedAt: new Date().toISOString() };
  await saveListings(listings);
  return listings[index];
}

export async function deleteListing(id: string) {
  const listings = await getListings({ includeDrafts: true });
  const next = listings.filter((item) => item.id !== id);
  if (next.length === listings.length) return false;
  await saveListings(next);
  return true;
}
