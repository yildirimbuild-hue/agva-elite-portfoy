import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CompanyProfile } from "./types";
import { getRuntimeSiteSettings } from "./site-settings-store";

const companyDataPath = path.join(process.cwd(), "data", "company.json");

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const [profile, settings] = await Promise.all([
    readFile(companyDataPath, "utf8").then((value) => JSON.parse(value) as CompanyProfile),
    getRuntimeSiteSettings(),
  ]);
  return {
    ...profile,
    whatsappNumber: settings.whatsappNumber,
    phoneNumber: settings.phoneNumber,
    aiEnabled: settings.aiEnabled,
  };
}
