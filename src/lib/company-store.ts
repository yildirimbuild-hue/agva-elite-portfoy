import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CompanyProfile } from "./types";

const companyDataPath = path.join(process.cwd(), "data", "company.json");

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const profile = JSON.parse(await readFile(companyDataPath, "utf8")) as CompanyProfile;
  return {
    ...profile,
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? profile.whatsappNumber,
    phoneNumber: process.env.NEXT_PUBLIC_PHONE_NUMBER ?? profile.phoneNumber,
  };
}
