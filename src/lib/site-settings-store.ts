import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AdminSiteSettings } from "./types";

type StoredSiteSettings = {
  version: 2;
  aiEnabled: boolean;
  aiModel: string;
  assistantInstructions: string;
  whatsappNumber: string;
  phoneNumber: string;
  encryptedApiKey?: string;
  voiceEnabled: boolean;
  elevenLabsVoiceId: string;
  elevenLabsModel: string;
  voiceStability: number;
  voiceSimilarity: number;
  encryptedElevenLabsApiKey?: string;
  updatedAt: string;
};

export type SiteSettingsUpdate = {
  aiEnabled?: unknown;
  aiModel?: unknown;
  assistantInstructions?: unknown;
  whatsappNumber?: unknown;
  phoneNumber?: unknown;
  apiKey?: unknown;
  clearApiKey?: unknown;
  voiceEnabled?: unknown;
  elevenLabsVoiceId?: unknown;
  elevenLabsModel?: unknown;
  voiceStability?: unknown;
  voiceSimilarity?: unknown;
  elevenLabsApiKey?: unknown;
  clearElevenLabsApiKey?: unknown;
};

const localPath = path.join(process.cwd(), "data", "site-settings.json");
const defaults: Omit<StoredSiteSettings, "updatedAt"> = {
  version: 2,
  aiEnabled: true,
  aiModel: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
  assistantInstructions: "",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
  phoneNumber: process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "",
  voiceEnabled: Boolean(process.env.ELEVENLABS_API_KEY),
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL",
  elevenLabsModel: process.env.ELEVENLABS_MODEL ?? "eleven_flash_v2_5",
  voiceStability: 0.45,
  voiceSimilarity: 0.82,
};

function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_DATA_REPOSITORY;
  const branch = process.env.GITHUB_DATA_BRANCH ?? "main";
  const filePath = process.env.GITHUB_SETTINGS_PATH ?? "data/site-settings.json";
  return token && repository ? { token, repository, branch, filePath } : null;
}

async function readGithub(config: NonNullable<ReturnType<typeof githubConfig>>) {
  const response = await fetch(`https://api.github.com/repos/${config.repository}/contents/${config.filePath}?ref=${config.branch}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${config.token}`, "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub ayar okuma hatası: ${response.status}`);
  const payload = await response.json() as { content: string; sha: string };
  return { value: JSON.parse(Buffer.from(payload.content, "base64").toString("utf8")) as StoredSiteSettings, sha: payload.sha };
}

async function writeGithub(config: NonNullable<ReturnType<typeof githubConfig>>, value: StoredSiteSettings) {
  const current = await readGithub(config);
  const response = await fetch(`https://api.github.com/repos/${config.repository}/contents/${config.filePath}`, {
    method: "PUT",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${config.token}`, "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
    body: JSON.stringify({
      message: "Update site settings",
      content: Buffer.from(`${JSON.stringify(value, null, 2)}\n`).toString("base64"),
      ...(current?.sha ? { sha: current.sha } : {}),
      branch: config.branch,
    }),
  });
  if (!response.ok) throw new Error(`GitHub ayar yazma hatası: ${response.status}`);
}

async function readStoredSettings() {
  const github = githubConfig();
  if (github) return (await readGithub(github))?.value ?? null;
  try {
    return JSON.parse(await readFile(localPath, "utf8")) as StoredSiteSettings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeStoredSettings(value: StoredSiteSettings) {
  const github = githubConfig();
  if (github) return writeGithub(github, value);
  if (process.env.VERCEL) throw new Error("Vercel üzerinde kalıcı ayar deposu yapılandırılmadı.");
  await mkdir(path.dirname(localPath), { recursive: true });
  const temporary = `${localPath}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, localPath);
}

function encryptionKey() {
  return createHash("sha256").update(process.env.ADMIN_SESSION_SECRET ?? "development-secret-must-be-replaced").digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function decrypt(value?: string) {
  if (!value) return "";
  try {
    const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

function phone(value: unknown) {
  if (typeof value !== "string") return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits && (digits.length < 10 || digits.length > 15)) throw new Error("Telefon numarası ülke koduyla 10-15 rakam olmalıdır.");
  return digits;
}

function model(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  if (!/^[a-z0-9._-]{2,80}$/i.test(cleaned)) throw new Error("DeepSeek model adı geçersiz.");
  return cleaned;
}

function voiceId(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  if (!/^[a-z0-9_-]{8,64}$/i.test(cleaned)) throw new Error("ElevenLabs ses kimliği geçersiz.");
  return cleaned;
}

function voiceModel(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  if (!/^[a-z0-9._-]{3,80}$/i.test(cleaned)) throw new Error("ElevenLabs model adı geçersiz.");
  return cleaned;
}

function unitValue(value: unknown, label: string) {
  if (typeof value !== "number") return undefined;
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${label} 0 ile 1 arasında olmalıdır.`);
  return Math.round(value * 100) / 100;
}

export async function getRuntimeSiteSettings() {
  const stored = await readStoredSettings();
  const merged = { ...defaults, ...(stored ?? {}) };
  const managedKey = decrypt(stored?.encryptedApiKey);
  const managedElevenLabsKey = decrypt(stored?.encryptedElevenLabsApiKey);
  return {
    aiEnabled: merged.aiEnabled,
    aiModel: merged.aiModel,
    assistantInstructions: merged.assistantInstructions,
    whatsappNumber: merged.whatsappNumber,
    phoneNumber: merged.phoneNumber,
    apiKey: managedKey || process.env.DEEPSEEK_API_KEY || "",
    apiKeySource: managedKey ? "managed" as const : process.env.DEEPSEEK_API_KEY ? "environment" as const : "none" as const,
    voiceEnabled: merged.voiceEnabled,
    elevenLabsVoiceId: merged.elevenLabsVoiceId,
    elevenLabsModel: merged.elevenLabsModel,
    voiceStability: merged.voiceStability,
    voiceSimilarity: merged.voiceSimilarity,
    elevenLabsApiKey: managedElevenLabsKey || process.env.ELEVENLABS_API_KEY || "",
    elevenLabsApiKeySource: managedElevenLabsKey ? "managed" as const : process.env.ELEVENLABS_API_KEY ? "environment" as const : "none" as const,
    updatedAt: stored?.updatedAt ?? null,
  };
}

export async function getAdminSiteSettings(): Promise<AdminSiteSettings> {
  const settings = await getRuntimeSiteSettings();
  const { apiKey, elevenLabsApiKey, ...publicSettings } = settings;
  return { ...publicSettings, hasApiKey: Boolean(apiKey), hasElevenLabsApiKey: Boolean(elevenLabsApiKey) };
}

export async function updateSiteSettings(input: SiteSettingsUpdate) {
  const currentStored = await readStoredSettings();
  const current = { ...defaults, ...(currentStored ?? {}) };
  const apiKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
  if (apiKey && apiKey.length < 20) throw new Error("DeepSeek API anahtarı beklenenden kısa.");
  const elevenLabsApiKey = typeof input.elevenLabsApiKey === "string" ? input.elevenLabsApiKey.trim() : "";
  if (elevenLabsApiKey && elevenLabsApiKey.length < 20) throw new Error("ElevenLabs API anahtarı beklenenden kısa.");
  const next: StoredSiteSettings = {
    ...current,
    version: 2,
    aiEnabled: typeof input.aiEnabled === "boolean" ? input.aiEnabled : current.aiEnabled,
    aiModel: model(input.aiModel) ?? current.aiModel,
    assistantInstructions: typeof input.assistantInstructions === "string" ? input.assistantInstructions.trim().slice(0, 1500) : current.assistantInstructions,
    whatsappNumber: phone(input.whatsappNumber) ?? current.whatsappNumber,
    phoneNumber: phone(input.phoneNumber) ?? current.phoneNumber,
    encryptedApiKey: input.clearApiKey === true ? undefined : apiKey ? encrypt(apiKey) : currentStored?.encryptedApiKey,
    voiceEnabled: typeof input.voiceEnabled === "boolean" ? input.voiceEnabled : current.voiceEnabled,
    elevenLabsVoiceId: voiceId(input.elevenLabsVoiceId) ?? current.elevenLabsVoiceId,
    elevenLabsModel: voiceModel(input.elevenLabsModel) ?? current.elevenLabsModel,
    voiceStability: unitValue(input.voiceStability, "Ses kararlılığı") ?? current.voiceStability,
    voiceSimilarity: unitValue(input.voiceSimilarity, "Ses benzerliği") ?? current.voiceSimilarity,
    encryptedElevenLabsApiKey: input.clearElevenLabsApiKey === true
      ? undefined
      : elevenLabsApiKey ? encrypt(elevenLabsApiKey) : currentStored?.encryptedElevenLabsApiKey,
    updatedAt: new Date().toISOString(),
  };
  await writeStoredSettings(next);
  return getAdminSiteSettings();
}
