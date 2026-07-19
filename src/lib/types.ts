export type ListingPurpose = "Satılık" | "Kiralık";
export type PropertyType = "Villa" | "Müstakil Ev" | "Daire" | "Arsa" | "Ticari";

export type Listing = {
  id: string;
  reference: string;
  title: string;
  slug: string;
  purpose: ListingPurpose;
  propertyType: PropertyType;
  location: string;
  district: string;
  price: number;
  oldPrice: number;
  currency: "TRY" | "USD" | "EUR";
  rooms: string;
  bathrooms: number;
  grossArea: number;
  netArea: number;
  landArea: number;
  floor: string;
  description: string;
  features: string[];
  images: string[];
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  featured: boolean;
  urgent: boolean;
  published: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CompanyProfile = {
  name: string;
  shortName: string;
  serviceArea: string;
  description: string;
  services: string[];
  workingHours: string;
  whatsappNumber: string;
  phoneNumber: string;
  aiEnabled: boolean;
};

export type AdminSiteSettings = {
  aiEnabled: boolean;
  aiModel: string;
  assistantInstructions: string;
  whatsappNumber: string;
  phoneNumber: string;
  hasApiKey: boolean;
  apiKeySource: "managed" | "environment" | "none";
  voiceEnabled: boolean;
  elevenLabsVoiceId: string;
  elevenLabsModel: string;
  voiceStability: number;
  voiceSimilarity: number;
  hasElevenLabsApiKey: boolean;
  elevenLabsApiKeySource: "managed" | "environment" | "none";
  updatedAt: string | null;
};

export type ListingInput = Omit<Listing, "id" | "reference" | "createdAt" | "updatedAt"> & {
  id?: string;
  reference?: string;
};

export type LeadKind = "bilgi" | "randevu";
export type LeadStage = "Yeni" | "Arandı" | "Gezdirildi" | "Teklif" | "Satıldı";
export type CustomerRole = "Alıcı" | "Satıcı" | "Kiracı" | "Ev Sahibi" | "Belirsiz";
export type LeadTemperature = "Sıcak" | "Ilık" | "Soğuk" | "Belirsiz";
export type FinancingType = "Nakit" | "Kredi" | "Nakit + Kredi" | "Belirsiz";
export type PurchaseTimeline = "Hemen" | "0-3 Ay" | "3-6 Ay" | "6+ Ay" | "Belirsiz";

export type LeadStageHistory = {
  stage: LeadStage;
  changedAt: string;
};

export type Lead = {
  id: string;
  kind: LeadKind;
  name: string;
  phone: string;
  email: string;
  customerRole: CustomerRole;
  budget: string;
  minBudget: number;
  maxBudget: number;
  budgetCurrency: "TRY" | "USD" | "EUR";
  region: string;
  preferredRegions: string[];
  propertyType: string;
  preferredPropertyTypes: string[];
  minRooms: string;
  minArea: number;
  financing: FinancingType;
  purchaseTimeline: PurchaseTimeline;
  mustHave: string[];
  niceToHave: string[];
  avoidFeatures: string[];
  appointmentTime: string;
  summary: string;
  listingReferences: string[];
  assignedAdvisor: string;
  temperature: LeadTemperature;
  lastContactAt: string;
  nextActionAt: string;
  stage: LeadStage;
  stageUpdatedAt: string;
  stageHistory: LeadStageHistory[];
  createdAt: string;
  updatedAt: string;
};

export type LeadInput = {
  kind: LeadKind;
  name: string;
  phone: string;
  budget?: string;
  region?: string;
  propertyType?: string;
  appointmentTime?: string;
  summary?: string;
  listingReferences?: string[];
  stage?: LeadStage;
  email?: string;
  customerRole?: CustomerRole;
  minBudget?: number;
  maxBudget?: number;
  budgetCurrency?: "TRY" | "USD" | "EUR";
  preferredRegions?: string[];
  preferredPropertyTypes?: string[];
  minRooms?: string;
  minArea?: number;
  financing?: FinancingType;
  purchaseTimeline?: PurchaseTimeline;
  mustHave?: string[];
  niceToHave?: string[];
  avoidFeatures?: string[];
  assignedAdvisor?: string;
  temperature?: LeadTemperature;
  lastContactAt?: string;
  nextActionAt?: string;
};

export type LeadProfileUpdate = Partial<Pick<Lead,
  | "name" | "phone" | "email" | "customerRole" | "budget" | "minBudget" | "maxBudget"
  | "budgetCurrency" | "region" | "preferredRegions" | "propertyType" | "preferredPropertyTypes"
  | "minRooms" | "minArea" | "financing" | "purchaseTimeline" | "mustHave" | "niceToHave"
  | "avoidFeatures" | "appointmentTime" | "summary" | "listingReferences" | "assignedAdvisor"
  | "temperature" | "lastContactAt" | "nextActionAt"
>>;

export type InteractionType = "Arama" | "WhatsApp" | "Not" | "Randevu" | "E-posta";

export type CustomerInteraction = {
  id: string;
  leadId: string;
  type: InteractionType;
  summary: string;
  outcome: string;
  nextActionAt: string;
  createdBy: string;
  createdAt: string;
};

export type CustomerInteractionInput = Omit<CustomerInteraction, "id" | "createdAt">;

export type ListingCopyResult = {
  title: string;
  description: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  slug: string;
  source: "deepseek" | "local";
};

export type AppointmentStatus = "Talep Alındı" | "Onaylandı" | "İptal Edildi" | "Tamamlandı" | "Gelmedi";
export type AppointmentSource = "ai-chat" | "listing-button" | "admin";

export type Appointment = {
  id: string;
  leadId: string;
  listingReference: string;
  listingTitle: string;
  customerName: string;
  phone: string;
  startAt: string;
  endAt: string;
  timezone: "Europe/Istanbul";
  status: AppointmentStatus;
  source: AppointmentSource;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentInput = Omit<Appointment, "id" | "leadId" | "listingTitle" | "endAt" | "timezone" | "status" | "createdAt" | "updatedAt"> & {
  holdToken: string;
};

export type AppointmentHold = {
  token: string;
  listingReference: string;
  startAt: string;
  endAt: string;
  expiresAt: string;
  createdAt: string;
};

export type AppointmentMode = "request" | "instant";

export type AppointmentSettings = {
  timezone: "Europe/Istanbul";
  workDays: number[];
  dayStart: string;
  dayEnd: string;
  slotMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  mode: AppointmentMode;
  blockedDates: string[];
  updatedAt: string;
};

export type AppointmentSlot = {
  startAt: string;
  endAt: string;
  label: string;
};

export type AppointmentDay = {
  date: string;
  label: string;
  slots: AppointmentSlot[];
};

export type MatchStatus = "eligible" | "insufficient_data" | "ineligible";
export type MatchEvidence = "explicit" | "inferred_from_role" | "missing";
export type MatchOutcome = "matched" | "not_matched" | "unknown" | "blocked";

export type MatchCriterion = {
  key: string;
  label: string;
  kind: "hard" | "soft";
  source: MatchEvidence;
  outcome: MatchOutcome;
  weight: number;
  awardedWeight: number;
  detail: string;
};

export type CustomerListingMatch = {
  leadId: string;
  listingReference: string;
  status: MatchStatus;
  score: number | null;
  coveragePercent: number;
  reasons: string[];
  warnings: string[];
  criteria: MatchCriterion[];
};

export type CustomerMatchResponse = {
  direction: "customer_to_listings";
  lead: Pick<Lead, "id" | "name" | "customerRole" | "stage">;
  matches: Array<CustomerListingMatch & { listing: Listing }>;
};

export type ListingMatchResponse = {
  direction: "listing_to_customers";
  listing: Pick<Listing, "reference" | "title" | "purpose" | "propertyType" | "location">;
  matches: Array<CustomerListingMatch & { lead: Pick<Lead, "id" | "name" | "phone" | "customerRole" | "stage" | "temperature"> }>;
};
