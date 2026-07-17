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

export type ListingInput = Omit<Listing, "id" | "reference" | "slug" | "createdAt" | "updatedAt"> & {
  id?: string;
  reference?: string;
  slug?: string;
};

export type LeadKind = "bilgi" | "randevu";

export type Lead = {
  id: string;
  kind: LeadKind;
  name: string;
  phone: string;
  budget: string;
  region: string;
  propertyType: string;
  appointmentTime: string;
  summary: string;
  listingReferences: string[];
  createdAt: string;
};

export type LeadInput = Omit<Lead, "id" | "createdAt">;
