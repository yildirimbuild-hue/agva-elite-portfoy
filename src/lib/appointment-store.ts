import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildAvailability, createAppointmentHold, isSlotAvailable, normalizeAppointmentSettings, purgeExpiredHolds } from "./appointment-engine";
import type { Appointment, AppointmentDay, AppointmentHold, AppointmentSettings, AppointmentStatus } from "./types";

const localDataPath = path.join(process.cwd(), "data", "appointment-state.json");
const MAX_APPOINTMENTS = 1000;

type AppointmentState = {
  settings: AppointmentSettings;
  appointments: Appointment[];
  holds: AppointmentHold[];
};

type ReadResult = { state: AppointmentState; sha: string | null };
let writeQueue = Promise.resolve();

function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_DATA_REPOSITORY;
  const branch = process.env.GITHUB_DATA_BRANCH ?? "main";
  const filePath = process.env.GITHUB_APPOINTMENTS_PATH ?? "data/appointment-state.json";
  return token && repository ? { token, repository, branch, filePath } : null;
}

function emptyState(): AppointmentState {
  return { settings: normalizeAppointmentSettings(null), appointments: [], holds: [] };
}

function normalizeState(value: Partial<AppointmentState> | null | undefined): AppointmentState {
  return {
    settings: normalizeAppointmentSettings(value?.settings),
    appointments: Array.isArray(value?.appointments) ? value.appointments : [],
    holds: purgeExpiredHolds(Array.isArray(value?.holds) ? value.holds : []),
  };
}

async function readGithubState(config: NonNullable<ReturnType<typeof githubConfig>>): Promise<ReadResult> {
  const response = await fetch(`https://api.github.com/repos/${config.repository}/contents/${config.filePath}?ref=${config.branch}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${config.token}`, "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store",
  });
  if (response.status === 404) return { state: emptyState(), sha: null };
  if (!response.ok) throw new Error(`GitHub randevu okuma hatası: ${response.status}`);
  const payload = await response.json() as { content: string; sha: string };
  return { state: normalizeState(JSON.parse(Buffer.from(payload.content, "base64").toString("utf8")) as AppointmentState), sha: payload.sha };
}

async function writeGithubState(config: NonNullable<ReturnType<typeof githubConfig>>, state: AppointmentState, sha: string | null) {
  const response = await fetch(`https://api.github.com/repos/${config.repository}/contents/${config.filePath}`, {
    method: "PUT",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${config.token}`, "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
    body: JSON.stringify({
      message: "Update appointment calendar",
      content: Buffer.from(`${JSON.stringify(state, null, 2)}\n`).toString("base64"),
      ...(sha ? { sha } : {}),
      branch: config.branch,
    }),
  });
  if (response.status === 409 || response.status === 422) throw new Error("APPOINTMENT_WRITE_CONFLICT");
  if (!response.ok) throw new Error(`GitHub randevu yazma hatası: ${response.status}`);
}

async function readLocalState(): Promise<ReadResult> {
  try { return { state: normalizeState(JSON.parse(await readFile(localDataPath, "utf8")) as AppointmentState), sha: null }; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { state: emptyState(), sha: null }; throw error; }
}

async function writeLocalState(state: AppointmentState) {
  if (process.env.VERCEL) throw new Error("Vercel üzerinde kalıcı randevu deposu yapılandırılmadı.");
  await mkdir(path.dirname(localDataPath), { recursive: true });
  const temporary = `${localDataPath}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporary, localDataPath);
}

async function readState() {
  const config = githubConfig();
  return config ? readGithubState(config) : readLocalState();
}

async function writeState(state: AppointmentState, sha: string | null) {
  const config = githubConfig();
  if (config) return writeGithubState(config, state, sha);
  return writeLocalState(state);
}

async function mutateState<T>(mutation: (state: AppointmentState) => T | Promise<T>): Promise<T> {
  let resolveResult!: (value: T) => void;
  let rejectResult!: (reason?: unknown) => void;
  const result = new Promise<T>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  writeQueue = writeQueue.then(async () => {
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const current = await readState();
        const state = normalizeState(current.state);
        const value = await mutation(state);
        try {
          await writeState(state, current.sha);
          resolveResult(value);
          return;
        } catch (error) {
          if ((error as Error).message === "APPOINTMENT_WRITE_CONFLICT" && attempt < 2) continue;
          throw error;
        }
      }
    } catch (error) { rejectResult(error); }
  });
  return result;
}

export async function getAppointmentSettings() {
  return (await readState()).state.settings;
}

export async function getAppointments() {
  return (await readState()).state.appointments.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function getAvailability(): Promise<{ settings: AppointmentSettings; days: AppointmentDay[] }> {
  const { state } = await readState();
  return { settings: state.settings, days: buildAvailability(state) };
}

export async function holdAppointmentSlot(listingReference: string, startAt: string) {
  return mutateState((state) => {
    const date = new Date(startAt);
    if (!Number.isFinite(date.getTime())) throw new Error("Geçersiz randevu saati.");
    const endAt = new Date(date.getTime() + state.settings.slotMinutes * 60 * 1000).toISOString();
    const canonicalStartAt = date.toISOString();
    if (!isSlotAvailable({ startAt: canonicalStartAt, endAt, appointments: state.appointments, holds: state.holds, settings: state.settings })) {
      throw new Error("Bu saat az önce doldu. Lütfen başka bir saat seçin.");
    }
    const hold = createAppointmentHold(listingReference, canonicalStartAt, endAt);
    state.holds = [...purgeExpiredHolds(state.holds), hold];
    return hold;
  });
}

export async function confirmAppointment(args: {
  holdToken: string;
  leadId: string;
  listingReference: string;
  listingTitle: string;
  customerName: string;
  phone: string;
  source: Appointment["source"];
  note: string;
}) {
  return mutateState((state) => {
    const hold = purgeExpiredHolds(state.holds).find((item) => item.token === args.holdToken);
    if (!hold || hold.listingReference !== args.listingReference) throw new Error("Saat tutma süresi doldu. Lütfen saati yeniden seçin.");
    if (!isSlotAvailable({ startAt: hold.startAt, endAt: hold.endAt, appointments: state.appointments, holds: state.holds, settings: state.settings, ignoreHoldToken: hold.token })) {
      throw new Error("Bu saat artık uygun değil. Lütfen başka bir saat seçin.");
    }
    const now = new Date().toISOString();
    const appointment: Appointment = {
      id: randomUUID(),
      leadId: args.leadId,
      listingReference: args.listingReference,
      listingTitle: args.listingTitle,
      customerName: args.customerName,
      phone: args.phone,
      startAt: hold.startAt,
      endAt: hold.endAt,
      timezone: "Europe/Istanbul",
      status: state.settings.mode === "instant" ? "Onaylandı" : "Talep Alındı",
      source: args.source,
      note: args.note,
      createdAt: now,
      updatedAt: now,
    };
    state.holds = state.holds.filter((item) => item.token !== hold.token);
    state.appointments = [...state.appointments, appointment].slice(-MAX_APPOINTMENTS);
    return appointment;
  });
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  return mutateState((state) => {
    const appointment = state.appointments.find((item) => item.id === id);
    if (!appointment) return null;
    appointment.status = status;
    appointment.updatedAt = new Date().toISOString();
    return appointment;
  });
}

export async function deleteAppointment(id: string) {
  return mutateState((state) => {
    const before = state.appointments.length;
    state.appointments = state.appointments.filter((item) => item.id !== id);
    return state.appointments.length !== before;
  });
}

export async function saveAppointmentSettings(input: Partial<AppointmentSettings>) {
  return mutateState((state) => {
    const settings = normalizeAppointmentSettings({ ...state.settings, ...input, updatedAt: new Date().toISOString() });
    if (settings.dayStart >= settings.dayEnd) throw new Error("Çalışma bitiş saati başlangıç saatinden sonra olmalıdır.");
    state.settings = settings;
    return settings;
  });
}
