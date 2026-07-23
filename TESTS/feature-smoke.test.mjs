import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

async function compileAndImport(relativePath) {
  const sourcePath = path.resolve(relativePath);
  const source = await readFile(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
    fileName: sourcePath,
  }).outputText;
  const directory = await mkdtemp(path.join(tmpdir(), "ikisu-feature-test-"));
  const outputPath = path.join(directory, `${path.basename(relativePath, ".ts")}.mjs`);
  await writeFile(outputPath, output, "utf8");
  return import(`${new URL(`file://${outputPath}`).href}?v=${Date.now()}`);
}

const copyModule = await compileAndImport("src/lib/listing-copy.ts");
const pipelineModule = await compileAndImport("src/lib/lead-pipeline.ts");

test("ilan yazarı tam olarak üç madde ister", () => {
  assert.throws(() => copyModule.sanitizeCopyInput({ points: ["Bir", "İki"] }), /üç/i);
  assert.equal(copyModule.sanitizeCopyInput({ points: ["Bir", "İki", "Üç"] }).points.length, 3);
});

test("yerel güvenli taslak SEO sınırlarını korur", () => {
  const result = copyModule.createLocalListingCopy({
    points: [
      "Orman manzaralı geniş bahçeli müstakil yaşam",
      "Şömine veranda ve araç park alanı",
      "Doğayla iç içe sakin konum",
    ],
    location: "Ağva Kurfallı",
    propertyType: "Villa",
    purpose: "Satılık",
  });
  assert.equal(result.source, "local");
  assert.ok(result.title.length <= 110);
  assert.ok(result.seoTitle.length <= 60);
  assert.ok(result.metaDescription.length <= 155);
  assert.match(result.slug, /^[a-z0-9-]+$/);
  assert.ok(result.description.includes("İKİSU Emlak"));
});

test("DeepSeek çıktısı normalize edilir ve karakter sınırları aşılmaz", () => {
  const result = copyModule.normalizeListingCopy({
    title: "T".repeat(180),
    description: "A".repeat(3000),
    seoTitle: "S".repeat(100),
    metaDescription: "M".repeat(300),
    keywords: Array.from({ length: 20 }, (_, index) => `kelime-${index}`),
    slug: "Ağva Özel Villa",
  }, "deepseek");
  assert.equal(result.title.length, 110);
  assert.equal(result.description.length, 2400);
  assert.equal(result.seoTitle.length, 60);
  assert.equal(result.metaDescription.length, 155);
  assert.equal(result.keywords.length, 8);
  assert.equal(result.slug, "agva-ozel-villa");
});

test("eski müşteri talepleri Yeni aşamasına geriye uyumlu taşınır", () => {
  const createdAt = "2026-07-13T09:00:00.000Z";
  const lead = pipelineModule.normalizeLead({
    id: "legacy-1",
    kind: "bilgi",
    name: "Test",
    phone: "905551112233",
    budget: "",
    region: "Ağva",
    propertyType: "Villa",
    appointmentTime: "",
    summary: "",
    listingReferences: [],
    createdAt,
  });
  assert.equal(lead.stage, "Yeni");
  assert.deepEqual(lead.stageHistory, [{ stage: "Yeni", changedAt: createdAt }]);
});

test("haftalık CRM dönüşüm özeti aşama geçmişini kullanır", () => {
  const leads = [
    {
      id: "1", kind: "bilgi", name: "A", phone: "1", budget: "", region: "", propertyType: "", appointmentTime: "", summary: "", listingReferences: [],
      stage: "Satıldı", stageUpdatedAt: "2026-07-16T15:00:00.000Z", createdAt: "2026-07-13T09:00:00.000Z",
      stageHistory: [
        { stage: "Yeni", changedAt: "2026-07-13T09:00:00.000Z" },
        { stage: "Arandı", changedAt: "2026-07-14T09:00:00.000Z" },
        { stage: "Gezdirildi", changedAt: "2026-07-15T09:00:00.000Z" },
        { stage: "Teklif", changedAt: "2026-07-16T09:00:00.000Z" },
        { stage: "Satıldı", changedAt: "2026-07-16T15:00:00.000Z" },
      ],
    },
    {
      id: "2", kind: "bilgi", name: "B", phone: "2", budget: "", region: "", propertyType: "", appointmentTime: "", summary: "", listingReferences: [],
      stage: "Arandı", stageUpdatedAt: "2026-07-17T10:00:00.000Z", createdAt: "2026-07-17T09:00:00.000Z",
      stageHistory: [{ stage: "Yeni", changedAt: "2026-07-17T09:00:00.000Z" }, { stage: "Arandı", changedAt: "2026-07-17T10:00:00.000Z" }],
    },
  ];
  const summary = pipelineModule.summarizeWeeklyLeads(leads, new Date("2026-07-17T18:00:00.000Z"));
  assert.equal(summary.newThisWeek, 2);
  assert.equal(summary.reached["Yeni"], 2);
  assert.equal(summary.reached["Arandı"], 2);
  assert.equal(summary.reached["Satıldı"], 1);
  assert.equal(summary.soldThisWeek, 1);
  assert.equal(summary.conversion, 50);
});

const appointmentEngine = await compileAndImport("src/lib/appointment-engine.ts");

test("randevu motoru çalışma günü ve kapalı tarihleri uygular", () => {
  const settings = appointmentEngine.normalizeAppointmentSettings({
    workDays: [1, 2, 3, 4, 5, 6],
    dayStart: "09:00",
    dayEnd: "12:00",
    slotMinutes: 60,
    bufferMinutes: 0,
    minNoticeHours: 0,
    maxAdvanceDays: 5,
    blockedDates: ["2026-07-18"],
  });
  const days = appointmentEngine.buildAvailability({ settings, appointments: [], holds: [], now: new Date("2026-07-17T05:00:00.000Z") });
  assert.ok(days.every((day) => day.date !== "2026-07-18"));
  assert.ok(days.every((day) => day.slots.length === 3));
});

test("dolu randevu aynı saatin yeniden gösterilmesini engeller", () => {
  const settings = appointmentEngine.normalizeAppointmentSettings({
    workDays: [6], dayStart: "09:00", dayEnd: "12:00", slotMinutes: 60, bufferMinutes: 0, minNoticeHours: 0, maxAdvanceDays: 1,
  });
  const appointments = [{
    id: "a1", leadId: "l1", listingReference: "IKS-0001", listingTitle: "Test", customerName: "A", phone: "905551112233",
    startAt: "2026-07-18T06:00:00.000Z", endAt: "2026-07-18T07:00:00.000Z", timezone: "Europe/Istanbul", status: "Onaylandı", source: "listing-button", note: "", createdAt: "2026-07-17T00:00:00.000Z", updatedAt: "2026-07-17T00:00:00.000Z",
  }];
  const days = appointmentEngine.buildAvailability({ settings, appointments, holds: [], now: new Date("2026-07-17T05:00:00.000Z") });
  const saturday = days.find((day) => day.date === "2026-07-18");
  assert.ok(saturday);
  assert.equal(saturday.slots.some((slot) => Date.parse(slot.startAt) === Date.parse("2026-07-18T06:00:00.000Z")), false);
});

test("geçici saat kilidi ikinci müşterinin aynı saati seçmesini engeller", () => {
  const settings = appointmentEngine.normalizeAppointmentSettings({ minNoticeHours: 0 });
  const now = new Date("2026-07-17T05:00:00.000Z");
  const hold = appointmentEngine.createAppointmentHold("IKS-0001", "2026-07-18T06:00:00.000Z", "2026-07-18T07:00:00.000Z", now);
  const available = appointmentEngine.isSlotAvailable({
    startAt: "2026-07-18T06:00:00.000Z",
    endAt: "2026-07-18T07:00:00.000Z",
    appointments: [], holds: [hold], settings, now,
  });
  assert.equal(available, false);
});

const customerCardModule = await compileAndImport("src/lib/customer-card.ts");
const interactionModule = await compileAndImport("src/lib/interaction-store.ts");

test("eski müşteri kaydı Paket 2 profil alanlarıyla güvenli biçimde tamamlanır", () => {
  const lead = pipelineModule.normalizeLead({
    id: "legacy-customer", kind: "bilgi", name: "Ayşe", phone: "905551112233",
    budget: "10 milyon", region: "Ağva", propertyType: "Villa", appointmentTime: "", summary: "",
    listingReferences: ["IKS-0001"], createdAt: "2026-07-17T09:00:00.000Z",
  });
  assert.equal(lead.customerRole, "Belirsiz");
  assert.equal(lead.temperature, "Belirsiz");
  assert.deepEqual(lead.preferredRegions, ["Ağva"]);
  assert.deepEqual(lead.preferredPropertyTypes, ["Villa"]);
  assert.equal(lead.updatedAt, lead.stageUpdatedAt);
});

test("müşteri kartı girdisi temizlenir, tekrarlar kaldırılır ve bütçe sırası düzeltilir", () => {
  const update = customerCardModule.sanitizeLeadProfileUpdate({
    name: "  Ayşe Yılmaz  ", phone: "+90 (555) 111 22 33", customerRole: "Alıcı",
    minBudget: 15000000, maxBudget: 10000000, preferredRegions: "Ağva, Şile, Ağva",
    preferredPropertyTypes: ["Villa", "Villa", "Müstakil Ev"], mustHave: "Bahçe, Bahçe, Otopark",
  });
  assert.equal(update.name, "Ayşe Yılmaz");
  assert.equal(update.phone, "+905551112233");
  assert.equal(update.minBudget, 10000000);
  assert.equal(update.maxBudget, 15000000);
  assert.deepEqual(update.preferredRegions, ["Ağva", "Şile"]);
  assert.deepEqual(update.mustHave, ["Bahçe", "Otopark"]);
});

test("kısmi müşteri kartı güncellemesi diğer alanları sıfırlayacak veri üretmez", () => {
  const update = customerCardModule.sanitizeLeadProfileUpdate({ lastContactAt: "2026-07-17T20:00:00.000Z" });
  assert.deepEqual(Object.keys(update), ["lastContactAt"]);
  assert.equal(update.name, undefined);
  assert.equal(update.phone, undefined);
});

test("müşteri profil doluluk puanı ölçülebilir alanlardan hesaplanır", () => {
  const score = customerCardModule.customerProfileCompleteness({
    name: "Ayşe", phone: "905551112233", customerRole: "Alıcı", preferredRegions: ["Ağva"],
    preferredPropertyTypes: ["Villa"], maxBudget: 15000000, financing: "Nakit", purchaseTimeline: "0-3 Ay",
    assignedAdvisor: "Adnan", nextActionAt: "2026-07-19T09:00:00.000Z",
  });
  assert.equal(score, 100);
});

test("iletişim kaydı kişisel veri taşmasını sınırlayan temiz bir sözleşmeye çevrilir", () => {
  const input = interactionModule.sanitizeInteractionInput({
    leadId: "lead-1", type: "Arama", summary: "  Müşteri villayı görmek istiyor.  ",
    outcome: "Randevu planlandı", nextActionAt: "2026-07-19T10:00:00.000Z", createdBy: "Adnan",
  });
  assert.equal(input.leadId, "lead-1");
  assert.equal(input.type, "Arama");
  assert.equal(input.summary, "Müşteri villayı görmek istiyor.");
  assert.equal(input.createdBy, "Adnan");
});

test("mevcut Yönetici AI özelliği admin panelinden doğrudan ve senkronize biçimde erişilebilir", async () => {
  const panelSource = await readFile("src/components/AdminPanel.tsx", "utf8");
  const conciergeSource = await readFile("src/components/AIConcierge.tsx", "utf8");

  assert.match(panelSource, /import \{ AIConcierge \} from "@\/components\/AIConcierge"/);
  assert.match(panelSource, /view === "assistant"/);
  assert.match(panelSource, /Yönetici AI/);
  assert.match(panelSource, /<AIConcierge adminAccess initiallyOpen onListingsChanged=/);
  assert.match(conciergeSource, /adminAccess \? "ready" : "public"/);
  assert.match(conciergeSource, /onListingsChanged\?\.\(\)/);
});

test("arka plandaki sistem sağlığı admin panelinde görünür ve yenilenebilir", async () => {
  const panelSource = await readFile("src/components/AdminPanel.tsx", "utf8");

  assert.match(panelSource, /view === "operations"/);
  assert.match(panelSource, /Sistem durumu/);
  assert.match(panelSource, /fetch\("\/api\/health", \{ cache: "no-store" \}\)/);
  assert.match(panelSource, /Sistem verilerini yenile/);
});

test("hash zincirli denetim olayları yalnız admin API üzerinden görünür", async () => {
  const panelSource = await readFile("src/components/AdminPanel.tsx", "utf8");
  const auditSource = await readFile("src/lib/audit-store.ts", "utf8");
  const routeSource = await readFile("src/app/api/admin/operations/route.ts", "utf8");

  assert.match(auditSource, /export async function getAuditEvents/);
  assert.match(routeSource, /isAdminAuthenticated/);
  assert.match(routeSource, /getAuditEvents/);
  assert.match(panelSource, /\/api\/admin\/operations/);
  assert.match(panelSource, /Denetim kayıtları/);
});

test("maskelenmiş hata olayları admin panelinde boş ve dolu durumlarıyla görünür", async () => {
  const panelSource = await readFile("src/components/AdminPanel.tsx", "utf8");
  const errorSource = await readFile("src/lib/error-store.ts", "utf8");
  const routeSource = await readFile("src/app/api/admin/operations/route.ts", "utf8");

  assert.match(errorSource, /export async function getErrorEvents/);
  assert.match(routeSource, /getErrorEvents/);
  assert.match(panelSource, /Hata olayları/);
  assert.match(panelSource, /Kayıtlı hata olayı yok/);
  assert.match(panelSource, /occurrenceCount/);
});



test("müşteri kartı eşleşme ekranı görünür sekmeyle erişilebilir", async () => {
  const source = await readFile("src/components/CustomerCardModal.tsx", "utf8");
  assert.match(source, /\["matches", "Eşleşmeler"\]/);
  assert.match(source, /onClick=\{\(\) => setTab\(key\)\}/);
  assert.match(source, /tab === "matches"/);
  assert.doesNotMatch(source, /tab !== "matches" \|\| matchData \|\| matchesLoading/);
  assert.doesNotMatch(source, /\[lead\.id, matchData, matchesLoading, tab\]/);
  assert.match(source, /Otomatik portföy eşleşmeleri/);
  assert.doesNotMatch(source, /reasons\.slice\(0, 4\)/);
  assert.match(source, /criterion\.outcome === "blocked" \|\| criterion\.outcome === "unknown"/);
});

test("portföy eşleşmelerinden müşteri kartına geçiş tek sahipli ve görünürdür", async () => {
  const panelSource = await readFile("src/components/AdminPanel.tsx", "utf8");
  const modalSource = await readFile("src/components/ListingMatchesModal.tsx", "utf8");
  assert.match(panelSource, /onOpenCustomer=\{\(leadId\) => \{ setMatchingListing\(null\); setSelectedLeadId\(leadId\); \}\}/);
  assert.match(modalSource, /onClick=\{\(\) => onOpenCustomer\(item\.lead\.id\)\}/);
  assert.match(modalSource, /Müşteri kartını aç/);
  assert.doesNotMatch(modalSource, /reasons\.slice\(0, 4\)/);
  assert.match(modalSource, /criterion\.outcome === "blocked" \|\| criterion\.outcome === "unknown"/);
});

const matchingModule = await compileAndImport("src/lib/matching-engine.ts");

function matchingLead(overrides = {}) {
  return {
    id: "lead-match", kind: "bilgi", name: "Ayşe", phone: "905551112233", email: "",
    customerRole: "Alıcı", budget: "", minBudget: 0, maxBudget: 15000000, budgetCurrency: "TRY",
    region: "Ağva", preferredRegions: ["Ağva"], propertyType: "Villa", preferredPropertyTypes: ["Villa"],
    minRooms: "3+1", minArea: 100, financing: "Belirsiz", purchaseTimeline: "Belirsiz",
    mustHave: [], niceToHave: [], avoidFeatures: [], appointmentTime: "", summary: "", listingReferences: [],
    assignedAdvisor: "", temperature: "Ilık", lastContactAt: "", nextActionAt: "", stage: "Yeni",
    stageUpdatedAt: "2026-07-18T09:00:00.000Z", stageHistory: [{ stage: "Yeni", changedAt: "2026-07-18T09:00:00.000Z" }],
    createdAt: "2026-07-18T09:00:00.000Z", updatedAt: "2026-07-18T09:00:00.000Z", ...overrides,
  };
}

function matchingListing(overrides = {}) {
  return {
    id: "listing-match", reference: "IKS-TEST", title: "Ağva Bahçeli Villa", slug: "agva-bahceli-villa",
    purpose: "Satılık", propertyType: "Villa", location: "Ağva Merkez", district: "Şile / İstanbul",
    price: 12000000, oldPrice: 0, currency: "TRY", rooms: "3+1", bathrooms: 2, grossArea: 140, netArea: 120,
    landArea: 900, floor: "2 kat", description: "Doğa ile iç içe villa.", features: ["Bahçe"], images: ["/x.webp"],
    seoTitle: "", metaDescription: "", keywords: [], featured: false, urgent: false, published: true, isDemo: true,
    createdAt: "2026-07-18T09:00:00.000Z", updatedAt: "2026-07-18T09:00:00.000Z", ...overrides,
  };
}

test("satıcı, ev sahibi ve belirsiz roller talep eşleşmesine alınmaz", () => {
  for (const customerRole of ["Satıcı", "Ev Sahibi", "Belirsiz"]) {
    const result = matchingModule.matchCustomerToListing(matchingLead({ customerRole }), matchingListing());
    assert.equal(result.status, "ineligible");
    assert.equal(result.score, null);
  }
});

test("bütçe dışındaki ilan uygun sayılmaz ve açıklayıcı engel üretir", () => {
  const result = matchingModule.matchCustomerToListing(matchingLead({ maxBudget: 10000000 }), matchingListing({ price: 18900000 }));
  assert.equal(result.status, "ineligible");
  assert.equal(result.score, null);
  assert.match(result.criteria.find((item) => item.key === "budget").detail, /bütçe aralığı dışında/i);
});

test("istenmeyen özellik hakkında bilgi yoksa kesin uygunluk verilmez", () => {
  const result = matchingModule.matchCustomerToListing(matchingLead({ avoidFeatures: ["Havuz"] }), matchingListing());
  assert.equal(result.status, "insufficient_data");
  assert.equal(result.criteria.find((item) => item.key === "avoid:Havuz").outcome, "unknown");
});

test("olumsuz özellik cümlesi pozitif kanıt sayılmaz", () => {
  const listing = matchingListing({ features: [], description: "Bu villada havuz yoktur." });
  const must = matchingModule.matchCustomerToListing(matchingLead({ mustHave: ["Havuz"] }), listing);
  const avoid = matchingModule.matchCustomerToListing(matchingLead({ avoidFeatures: ["Havuz"] }), listing);
  assert.equal(must.status, "ineligible");
  assert.equal(avoid.status, "eligible");
});

test("yalnız kesin kriterleri olan müşteri görünür ve puansız uygun sonuç üretir", () => {
  const lead = matchingLead({ region: "", preferredRegions: [], propertyType: "", preferredPropertyTypes: [], niceToHave: [] });
  const ranked = matchingModule.rankListingsForCustomer(lead, [matchingListing()]);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].status, "eligible");
  assert.equal(ranked[0].score, null);
  assert.equal(ranked[0].coveragePercent, 100);
});

test("eksik ilan konumu bölge uyumsuzluğu değil unknown sayılır", () => {
  const result = matchingModule.matchCustomerToListing(matchingLead(), matchingListing({ location: "", district: "" }));
  const region = result.criteria.find((item) => item.key === "region");
  assert.equal(region.outcome, "unknown");
  assert.ok(result.coveragePercent < 100);
});

test("villa alanında arsa büyüklüğü yaşam alanı yerine kullanılmaz", () => {
  const result = matchingModule.matchCustomerToListing(matchingLead({ minArea: 200 }), matchingListing({ netArea: 0, grossArea: 0, landArea: 1000 }));
  assert.equal(result.status, "insufficient_data");
  assert.equal(result.criteria.find((item) => item.key === "area").outcome, "unknown");
});

test("eşleştirme sıralaması aynı girdide deterministiktir", () => {
  const lead = matchingLead();
  const listings = [matchingListing({ reference: "IKS-B", id: "b" }), matchingListing({ reference: "IKS-A", id: "a" })];
  const first = matchingModule.rankListingsForCustomer(lead, listings).map((item) => item.listing.reference);
  const second = matchingModule.rankListingsForCustomer(lead, [...listings].reverse()).map((item) => item.listing.reference);
  assert.deepEqual(first, ["IKS-A", "IKS-B"]);
  assert.deepEqual(second, first);
});
