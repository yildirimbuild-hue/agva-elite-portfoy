import type { Lead, LeadStage, LeadStageHistory } from "./types";

const CUSTOMER_ROLES = ["Alıcı", "Satıcı", "Kiracı", "Ev Sahibi", "Belirsiz"] as const;
const LEAD_TEMPERATURES = ["Sıcak", "Ilık", "Soğuk", "Belirsiz"] as const;
const FINANCING_TYPES = ["Nakit", "Kredi", "Nakit + Kredi", "Belirsiz"] as const;
const PURCHASE_TIMELINES = ["Hemen", "0-3 Ay", "3-6 Ay", "6+ Ay", "Belirsiz"] as const;

function normalizeStringList(value: unknown, maxItems = 20, itemLimit = 80) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(source.map((item) => typeof item === "string" ? item.trim().slice(0, itemLimit) : "").filter(Boolean))].slice(0, maxItems);
}

export const LEAD_STAGES: LeadStage[] = ["Yeni", "Arandı", "Gezdirildi", "Teklif", "Satıldı"];

export function isLeadStage(value: unknown): value is LeadStage {
  return typeof value === "string" && LEAD_STAGES.includes(value as LeadStage);
}

function safeIso(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value) return fallback;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

export function normalizeLead(lead: Partial<Lead> & { id: string; createdAt: string }): Lead {
  const createdAt = safeIso(lead.createdAt, new Date(0).toISOString());
  const stage = isLeadStage(lead.stage) ? lead.stage : "Yeni";
  const rawHistory = Array.isArray(lead.stageHistory) ? lead.stageHistory : [];
  const stageHistory = rawHistory
    .filter((item): item is LeadStageHistory => Boolean(item) && isLeadStage(item.stage))
    .map((item) => ({ stage: item.stage, changedAt: safeIso(item.changedAt, createdAt) }))
    .sort((a, b) => a.changedAt.localeCompare(b.changedAt));
  if (!stageHistory.length) stageHistory.push({ stage, changedAt: safeIso(lead.stageUpdatedAt, createdAt) });
  if (stageHistory.at(-1)?.stage !== stage) stageHistory.push({ stage, changedAt: safeIso(lead.stageUpdatedAt, createdAt) });
  const stageUpdatedAt = safeIso(lead.stageUpdatedAt, stageHistory.at(-1)?.changedAt ?? createdAt);
  const updatedAt = safeIso(lead.updatedAt, stageUpdatedAt);
  const customerRole = CUSTOMER_ROLES.includes(lead.customerRole as Lead["customerRole"]) ? lead.customerRole as Lead["customerRole"] : "Belirsiz";
  const temperature = LEAD_TEMPERATURES.includes(lead.temperature as Lead["temperature"]) ? lead.temperature as Lead["temperature"] : "Belirsiz";
  const financing = FINANCING_TYPES.includes(lead.financing as Lead["financing"]) ? lead.financing as Lead["financing"] : "Belirsiz";
  const purchaseTimeline = PURCHASE_TIMELINES.includes(lead.purchaseTimeline as Lead["purchaseTimeline"]) ? lead.purchaseTimeline as Lead["purchaseTimeline"] : "Belirsiz";
  const budgetCurrency = ["TRY", "USD", "EUR"].includes(lead.budgetCurrency as string) ? lead.budgetCurrency as Lead["budgetCurrency"] : "TRY";
  const region = typeof lead.region === "string" ? lead.region : "";
  const propertyType = typeof lead.propertyType === "string" ? lead.propertyType : "";
  return {
    ...lead,
    kind: lead.kind === "randevu" ? "randevu" : "bilgi",
    name: typeof lead.name === "string" ? lead.name : "",
    phone: typeof lead.phone === "string" ? lead.phone : "",
    email: typeof lead.email === "string" ? lead.email : "",
    customerRole,
    budget: typeof lead.budget === "string" ? lead.budget : "",
    minBudget: positiveNumber(lead.minBudget),
    maxBudget: positiveNumber(lead.maxBudget),
    budgetCurrency,
    region,
    preferredRegions: normalizeStringList(lead.preferredRegions?.length ? lead.preferredRegions : region ? [region] : [], 12),
    propertyType,
    preferredPropertyTypes: normalizeStringList(lead.preferredPropertyTypes?.length ? lead.preferredPropertyTypes : propertyType ? [propertyType] : [], 10),
    minRooms: typeof lead.minRooms === "string" ? lead.minRooms : "",
    minArea: positiveNumber(lead.minArea),
    financing,
    purchaseTimeline,
    mustHave: normalizeStringList(lead.mustHave),
    niceToHave: normalizeStringList(lead.niceToHave),
    avoidFeatures: normalizeStringList(lead.avoidFeatures),
    appointmentTime: typeof lead.appointmentTime === "string" ? lead.appointmentTime : "",
    summary: typeof lead.summary === "string" ? lead.summary : "",
    listingReferences: normalizeStringList(lead.listingReferences, 50, 24).map((item) => item.toUpperCase()),
    assignedAdvisor: typeof lead.assignedAdvisor === "string" ? lead.assignedAdvisor : "",
    temperature,
    lastContactAt: safeIso(lead.lastContactAt, ""),
    nextActionAt: safeIso(lead.nextActionAt, ""),
    stage,
    stageUpdatedAt,
    stageHistory,
    createdAt,
    updatedAt,
  };
}

export function leadReachedStage(lead: Lead, stage: LeadStage) {
  const normalized = normalizeLead(lead);
  const targetIndex = LEAD_STAGES.indexOf(stage);
  return normalized.stageHistory.some((item) => LEAD_STAGES.indexOf(item.stage) >= targetIndex);
}

export function startOfWeek(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function summarizeWeeklyLeads(leads: Lead[], now = new Date()) {
  const weekStart = startOfWeek(now).getTime();
  const cohort = leads.map(normalizeLead).filter((lead) => Date.parse(lead.createdAt) >= weekStart);
  const reached = Object.fromEntries(LEAD_STAGES.map((stage) => [stage, cohort.filter((lead) => leadReachedStage(lead, stage)).length])) as Record<LeadStage, number>;
  const soldThisWeek = leads.map(normalizeLead).filter((lead) => lead.stageHistory.some((item) => item.stage === "Satıldı" && Date.parse(item.changedAt) >= weekStart)).length;
  const conversion = cohort.length ? Math.round((reached["Satıldı"] / cohort.length) * 100) : 0;
  return { weekStart: new Date(weekStart).toISOString(), newThisWeek: cohort.length, soldThisWeek, reached, conversion };
}
