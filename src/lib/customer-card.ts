import type { CustomerRole, FinancingType, LeadProfileUpdate, LeadTemperature, PurchaseTimeline } from "./types";

export const CUSTOMER_ROLES: CustomerRole[] = ["Alıcı", "Satıcı", "Kiracı", "Ev Sahibi", "Belirsiz"];
export const LEAD_TEMPERATURES: LeadTemperature[] = ["Sıcak", "Ilık", "Soğuk", "Belirsiz"];
export const FINANCING_TYPES: FinancingType[] = ["Nakit", "Kredi", "Nakit + Kredi", "Belirsiz"];
export const PURCHASE_TIMELINES: PurchaseTimeline[] = ["Hemen", "0-3 Ay", "3-6 Ay", "6+ Ay", "Belirsiz"];

function text(value: unknown, limit = 240) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function nonNegative(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function has(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

export function normalizeStringList(value: unknown, maxItems = 20, itemLimit = 80) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(source.map((item) => text(item, itemLimit)).filter(Boolean))].slice(0, maxItems);
}

export function sanitizeLeadProfileUpdate(input: unknown): LeadProfileUpdate {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const update: LeadProfileUpdate = {};

  if (has(body, "name")) update.name = text(body.name, 80);
  if (has(body, "phone")) update.phone = text(body.phone, 24).replace(/[^\d+]/g, "");
  if (has(body, "email")) update.email = text(body.email, 120).toLowerCase();
  if (has(body, "budget")) update.budget = text(body.budget, 100);
  if (has(body, "minBudget")) update.minBudget = nonNegative(body.minBudget);
  if (has(body, "maxBudget")) update.maxBudget = nonNegative(body.maxBudget);
  if (has(body, "region")) update.region = text(body.region, 120);
  if (has(body, "preferredRegions")) update.preferredRegions = normalizeStringList(body.preferredRegions, 12);
  if (has(body, "propertyType")) update.propertyType = text(body.propertyType, 80);
  if (has(body, "preferredPropertyTypes")) update.preferredPropertyTypes = normalizeStringList(body.preferredPropertyTypes, 10);
  if (has(body, "minRooms")) update.minRooms = text(body.minRooms, 30);
  if (has(body, "minArea")) update.minArea = nonNegative(body.minArea);
  if (has(body, "mustHave")) update.mustHave = normalizeStringList(body.mustHave);
  if (has(body, "niceToHave")) update.niceToHave = normalizeStringList(body.niceToHave);
  if (has(body, "avoidFeatures")) update.avoidFeatures = normalizeStringList(body.avoidFeatures);
  if (has(body, "appointmentTime")) update.appointmentTime = text(body.appointmentTime, 120);
  if (has(body, "summary")) update.summary = text(body.summary, 1200);
  if (has(body, "listingReferences")) update.listingReferences = normalizeStringList(body.listingReferences, 50, 24).map((item) => item.toUpperCase());
  if (has(body, "assignedAdvisor")) update.assignedAdvisor = text(body.assignedAdvisor, 80);
  if (has(body, "lastContactAt")) update.lastContactAt = text(body.lastContactAt, 40);
  if (has(body, "nextActionAt")) update.nextActionAt = text(body.nextActionAt, 40);

  if (has(body, "customerRole") && CUSTOMER_ROLES.includes(body.customerRole as CustomerRole)) update.customerRole = body.customerRole as CustomerRole;
  if (has(body, "temperature") && LEAD_TEMPERATURES.includes(body.temperature as LeadTemperature)) update.temperature = body.temperature as LeadTemperature;
  if (has(body, "financing") && FINANCING_TYPES.includes(body.financing as FinancingType)) update.financing = body.financing as FinancingType;
  if (has(body, "purchaseTimeline") && PURCHASE_TIMELINES.includes(body.purchaseTimeline as PurchaseTimeline)) update.purchaseTimeline = body.purchaseTimeline as PurchaseTimeline;
  if (has(body, "budgetCurrency") && ["TRY", "USD", "EUR"].includes(body.budgetCurrency as string)) update.budgetCurrency = body.budgetCurrency as "TRY" | "USD" | "EUR";

  if (update.maxBudget && update.minBudget && update.maxBudget < update.minBudget) {
    [update.minBudget, update.maxBudget] = [update.maxBudget, update.minBudget];
  }
  return update;
}

export function customerProfileCompleteness(lead: {
  name?: string; phone?: string; customerRole?: string; preferredRegions?: string[]; preferredPropertyTypes?: string[];
  minBudget?: number; maxBudget?: number; financing?: string; purchaseTimeline?: string; assignedAdvisor?: string; nextActionAt?: string;
}) {
  const checks = [
    Boolean(lead.name), Boolean(lead.phone), Boolean(lead.customerRole && lead.customerRole !== "Belirsiz"),
    Boolean(lead.preferredRegions?.length), Boolean(lead.preferredPropertyTypes?.length),
    Boolean(lead.minBudget || lead.maxBudget), Boolean(lead.financing && lead.financing !== "Belirsiz"),
    Boolean(lead.purchaseTimeline && lead.purchaseTimeline !== "Belirsiz"), Boolean(lead.assignedAdvisor), Boolean(lead.nextActionAt),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
