import type { CustomerListingMatch, Lead, Listing, MatchCriterion, MatchStatus } from "./types";

const SOFT_WEIGHTS = { region: 40, propertyType: 35, niceToHave: 25 } as const;

function normalized(value: unknown) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function includesTerm(value: string, term: string) {
  const haystack = ` ${normalized(value)} `;
  const needle = ` ${normalized(term)} `;
  return needle.trim().length > 0 && haystack.includes(needle);
}

function evidenceForFeature(listing: Listing, feature: string): "positive" | "negative" | "unknown" {
  const term = normalized(feature);
  if (!term) return "unknown";
  const sources = [
    ...listing.features,
    listing.title,
    listing.description,
    listing.location,
    listing.district,
    listing.seoTitle,
    listing.metaDescription,
    ...listing.keywords,
  ].filter(Boolean).map(normalized);

  let positive = false;
  let negative = false;
  for (const source of sources) {
    if (!includesTerm(source, term)) continue;
    const negativePatterns = [
      `${term} yok`, `${term} yoktur`, `${term} bulunmuyor`, `${term} bulunmamaktadir`,
      `${term} mevcut degil`, `${term} degil`, `${term} olmadan`, `${term}siz`,
    ];
    if (negativePatterns.some((pattern) => source.includes(pattern))) negative = true;
    else positive = true;
  }
  if (positive) return "positive";
  if (negative) return "negative";
  return "unknown";
}

function roomCount(value: string) {
  const parts = value.match(/\d+/g)?.map(Number) ?? [];
  return parts.reduce((sum, item) => sum + item, 0);
}

function livingArea(listing: Listing) {
  if (listing.propertyType === "Arsa") return listing.landArea > 0 ? listing.landArea : 0;
  return listing.netArea > 0 ? listing.netArea : listing.grossArea > 0 ? listing.grossArea : 0;
}

function criterion(input: MatchCriterion) { return input; }

function desiredPurpose(lead: Lead) {
  if (lead.customerRole === "Alıcı") return { value: "Satılık" as const, source: "inferred_from_role" as const };
  if (lead.customerRole === "Kiracı") return { value: "Kiralık" as const, source: "inferred_from_role" as const };
  return null;
}

export function matchCustomerToListing(lead: Lead, listing: Listing): CustomerListingMatch {
  const criteria: MatchCriterion[] = [];
  const reasons: string[] = [];
  const warnings: string[] = [];
  let hardBlocked = false;
  let hardUnknown = false;

  const purpose = desiredPurpose(lead);
  if (!purpose) {
    criteria.push(criterion({ key: "roleDirection", label: "Talep yönü", kind: "hard", source: lead.customerRole === "Belirsiz" ? "missing" : "explicit", outcome: "blocked", weight: 0, awardedWeight: 0, detail: `${lead.customerRole} profili portföy talebi olarak değerlendirilemez.` }));
    hardBlocked = true;
  } else {
    const matched = listing.purpose === purpose.value;
    criteria.push(criterion({ key: "purpose", label: "İşlem türü", kind: "hard", source: purpose.source, outcome: matched ? "matched" : "blocked", weight: 0, awardedWeight: 0, detail: matched ? `${purpose.value} talebiyle uyumlu.` : `${purpose.value} talebi, ${listing.purpose} ilanla uyumsuz.` }));
    if (!matched) hardBlocked = true; else reasons.push(`${purpose.value} işlem türü uyumlu`);
  }

  if (lead.maxBudget > 0 || lead.minBudget > 0) {
    if (!listing.price || listing.currency !== lead.budgetCurrency) {
      criteria.push(criterion({ key: "budget", label: "Bütçe", kind: "hard", source: "missing", outcome: "unknown", weight: 0, awardedWeight: 0, detail: listing.currency !== lead.budgetCurrency ? "Kur dönüşümü olmadan farklı para birimleri kesin karşılaştırılamaz." : "İlan fiyatı eksik." }));
      hardUnknown = true;
    } else {
      const minOk = lead.minBudget <= 0 || listing.price >= lead.minBudget;
      const maxOk = lead.maxBudget <= 0 || listing.price <= lead.maxBudget;
      const matched = minOk && maxOk;
      criteria.push(criterion({ key: "budget", label: "Bütçe", kind: "hard", source: "explicit", outcome: matched ? "matched" : "blocked", weight: 0, awardedWeight: 0, detail: matched ? "İlan fiyatı bütçe aralığında." : "İlan fiyatı bütçe aralığı dışında." }));
      if (!matched) hardBlocked = true; else reasons.push("Bütçe aralığında");
    }
  }

  if (lead.minRooms.trim()) {
    const wanted = roomCount(lead.minRooms);
    const actual = roomCount(listing.rooms);
    if (!wanted || !actual) {
      criteria.push(criterion({ key: "rooms", label: "Minimum oda", kind: "hard", source: "missing", outcome: "unknown", weight: 0, awardedWeight: 0, detail: "Oda bilgisi kesin karşılaştırılamıyor." }));
      hardUnknown = true;
    } else {
      const matched = actual >= wanted;
      criteria.push(criterion({ key: "rooms", label: "Minimum oda", kind: "hard", source: "explicit", outcome: matched ? "matched" : "blocked", weight: 0, awardedWeight: 0, detail: matched ? "Minimum oda isteğini karşılıyor." : "Minimum oda isteğini karşılamıyor." }));
      if (!matched) hardBlocked = true; else reasons.push("Oda ihtiyacını karşılıyor");
    }
  }

  if (lead.minArea > 0) {
    const area = livingArea(listing);
    if (!area) {
      criteria.push(criterion({ key: "area", label: "Minimum alan", kind: "hard", source: "missing", outcome: "unknown", weight: 0, awardedWeight: 0, detail: "Yaşam alanı bilgisi eksik." }));
      hardUnknown = true;
    } else {
      const matched = area >= lead.minArea;
      criteria.push(criterion({ key: "area", label: "Minimum alan", kind: "hard", source: "explicit", outcome: matched ? "matched" : "blocked", weight: 0, awardedWeight: 0, detail: matched ? `${area} m² alan isteğini karşılıyor.` : `${area} m² alan isteğin altında.` }));
      if (!matched) hardBlocked = true; else reasons.push("Alan ihtiyacını karşılıyor");
    }
  }

  for (const feature of lead.mustHave) {
    const evidence = evidenceForFeature(listing, feature);
    if (evidence === "positive") {
      criteria.push(criterion({ key: `must:${feature}`, label: `Vazgeçilmez: ${feature}`, kind: "hard", source: "explicit", outcome: "matched", weight: 0, awardedWeight: 0, detail: `${feature} özelliği doğrulandı.` }));
      reasons.push(`${feature} var`);
    } else if (evidence === "negative") {
      criteria.push(criterion({ key: `must:${feature}`, label: `Vazgeçilmez: ${feature}`, kind: "hard", source: "explicit", outcome: "blocked", weight: 0, awardedWeight: 0, detail: `${feature} özelliğinin olmadığı açıkça belirtilmiş.` }));
      hardBlocked = true;
    } else {
      criteria.push(criterion({ key: `must:${feature}`, label: `Vazgeçilmez: ${feature}`, kind: "hard", source: "missing", outcome: "unknown", weight: 0, awardedWeight: 0, detail: `${feature} özelliği doğrulanamadı.` }));
      hardUnknown = true;
    }
  }

  for (const feature of lead.avoidFeatures) {
    const evidence = evidenceForFeature(listing, feature);
    if (evidence === "positive") {
      criteria.push(criterion({ key: `avoid:${feature}`, label: `İstenmeyen: ${feature}`, kind: "hard", source: "explicit", outcome: "blocked", weight: 0, awardedWeight: 0, detail: `${feature} özelliği ilanda mevcut.` }));
      hardBlocked = true;
    } else if (evidence === "negative") {
      criteria.push(criterion({ key: `avoid:${feature}`, label: `İstenmeyen: ${feature}`, kind: "hard", source: "explicit", outcome: "matched", weight: 0, awardedWeight: 0, detail: `${feature} özelliğinin olmadığı açıkça belirtilmiş.` }));
      reasons.push(`${feature} bulunmuyor`);
    } else {
      criteria.push(criterion({ key: `avoid:${feature}`, label: `İstenmeyen: ${feature}`, kind: "hard", source: "missing", outcome: "unknown", weight: 0, awardedWeight: 0, detail: `${feature} özelliğinin bulunup bulunmadığı bilinmiyor.` }));
      hardUnknown = true;
    }
  }

  let totalPotentialWeight = 0;
  let evaluableWeight = 0;
  let awardedWeight = 0;

  const regions = lead.preferredRegions.length ? lead.preferredRegions : lead.region ? [lead.region] : [];
  if (regions.length) {
    totalPotentialWeight += SOFT_WEIGHTS.region;
    const location = `${listing.location} ${listing.district}`.trim();
    if (!location) {
      criteria.push(criterion({ key: "region", label: "Bölge", kind: "soft", source: "missing", outcome: "unknown", weight: SOFT_WEIGHTS.region, awardedWeight: 0, detail: "İlan konumu eksik." }));
    } else {
      evaluableWeight += SOFT_WEIGHTS.region;
      const matched = regions.some((item) => includesTerm(location, item) || includesTerm(item, listing.location));
      const award = matched ? SOFT_WEIGHTS.region : 0;
      awardedWeight += award;
      criteria.push(criterion({ key: "region", label: "Bölge", kind: "soft", source: "explicit", outcome: matched ? "matched" : "not_matched", weight: SOFT_WEIGHTS.region, awardedWeight: award, detail: matched ? "Tercih edilen bölgeyle uyumlu." : "Tercih edilen bölgelerle eşleşmiyor." }));
      if (matched) reasons.push("Bölge tercihi uyumlu");
    }
  }

  const propertyTypes = lead.preferredPropertyTypes.length ? lead.preferredPropertyTypes : lead.propertyType ? [lead.propertyType] : [];
  if (propertyTypes.length) {
    totalPotentialWeight += SOFT_WEIGHTS.propertyType;
    evaluableWeight += SOFT_WEIGHTS.propertyType;
    const matched = propertyTypes.some((item) => normalized(item) === normalized(listing.propertyType));
    const award = matched ? SOFT_WEIGHTS.propertyType : 0;
    awardedWeight += award;
    criteria.push(criterion({ key: "propertyType", label: "Gayrimenkul türü", kind: "soft", source: "explicit", outcome: matched ? "matched" : "not_matched", weight: SOFT_WEIGHTS.propertyType, awardedWeight: award, detail: matched ? "Tercih edilen gayrimenkul türüyle uyumlu." : "Tercih edilen türlerle eşleşmiyor." }));
    if (matched) reasons.push("Gayrimenkul türü uyumlu");
  }

  if (lead.niceToHave.length) {
    const eachWeight = SOFT_WEIGHTS.niceToHave / lead.niceToHave.length;
    totalPotentialWeight += SOFT_WEIGHTS.niceToHave;
    for (const feature of lead.niceToHave) {
      const evidence = evidenceForFeature(listing, feature);
      if (evidence === "unknown") {
        criteria.push(criterion({ key: `nice:${feature}`, label: `Tercih: ${feature}`, kind: "soft", source: "missing", outcome: "unknown", weight: eachWeight, awardedWeight: 0, detail: `${feature} bilgisi bulunmuyor.` }));
      } else {
        evaluableWeight += eachWeight;
        const matched = evidence === "positive";
        const award = matched ? eachWeight : 0;
        awardedWeight += award;
        criteria.push(criterion({ key: `nice:${feature}`, label: `Tercih: ${feature}`, kind: "soft", source: "explicit", outcome: matched ? "matched" : "not_matched", weight: eachWeight, awardedWeight: award, detail: matched ? `${feature} tercihi karşılanıyor.` : `${feature} özelliğinin olmadığı belirtilmiş.` }));
        if (matched) reasons.push(`${feature} tercihi var`);
      }
    }
  }

  const coveragePercent = totalPotentialWeight === 0 ? 100 : Math.round((evaluableWeight / totalPotentialWeight) * 100);
  const score = totalPotentialWeight === 0 || evaluableWeight === 0 || coveragePercent < 60
    ? null
    : Math.round((awardedWeight / evaluableWeight) * 100);

  let status: MatchStatus = "eligible";
  if (hardBlocked) status = "ineligible";
  else if (hardUnknown || (totalPotentialWeight > 0 && score === null)) status = "insufficient_data";

  const visibleScore = status === "eligible" ? score : null;

  if (status === "insufficient_data") warnings.push("Kesin karar için ilan veya müşteri bilgisinin tamamlanması gerekiyor.");
  if (totalPotentialWeight === 0 && !hardBlocked && !hardUnknown) warnings.push("Kesin kriterler geçildi; sıralama puanı üretecek tercih bilgisi yok.");
  if (reasons.length === 0 && status === "eligible") reasons.push("Kesin uygunluk kriterlerini karşılıyor");

  return { leadId: lead.id, listingReference: listing.reference, status, score: visibleScore, coveragePercent, reasons, warnings, criteria };
}

function statusRank(status: MatchStatus) { return status === "eligible" ? 0 : status === "insufficient_data" ? 1 : 2; }

export function rankListingsForCustomer(lead: Lead, listings: Listing[]) {
  return listings.filter((listing) => listing.published).map((listing) => ({ ...matchCustomerToListing(lead, listing), listing }))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || (b.score ?? -1) - (a.score ?? -1) || b.coveragePercent - a.coveragePercent || a.listing.reference.localeCompare(b.listing.reference, "tr"));
}

export function rankCustomersForListing(listing: Listing, leads: Lead[]) {
  return leads.filter((lead) => lead.stage !== "Satıldı").map((lead) => ({ ...matchCustomerToListing(lead, listing), lead: { id: lead.id, name: lead.name, phone: lead.phone, customerRole: lead.customerRole, stage: lead.stage, temperature: lead.temperature } }))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || (b.score ?? -1) - (a.score ?? -1) || b.coveragePercent - a.coveragePercent || a.lead.name.localeCompare(b.lead.name, "tr") || a.lead.id.localeCompare(b.lead.id));
}
