"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STAGES, summarizeWeeklyLeads } from "@/lib/lead-pipeline";
import { AIConcierge } from "@/components/AIConcierge";
import { CustomerCardModal } from "@/components/CustomerCardModal";
import { ListingMatchesModal } from "@/components/ListingMatchesModal";
import type { AdminSiteSettings, Appointment, AppointmentSettings, AppointmentStatus, Lead, LeadStage, Listing, ListingCopyResult, ListingInput, ListingPurpose, PropertyType } from "@/lib/types";

const emptyForm: ListingInput = {
  title: "",
  slug: "",
  purpose: "Satılık",
  propertyType: "Villa",
  location: "Ağva Merkez",
  district: "Şile / İstanbul",
  price: 0,
  oldPrice: 0,
  currency: "TRY",
  rooms: "3+1",
  bathrooms: 1,
  grossArea: 0,
  netArea: 0,
  landArea: 0,
  floor: "",
  description: "",
  seoTitle: "",
  metaDescription: "",
  keywords: [],
  features: [],
  images: [],
  featured: false,
  urgent: false,
  published: true,
  isDemo: false,
};

const formatPrice = (listing: Listing) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: listing.currency, maximumFractionDigits: 0 }).format(listing.price);

const fallbackAppointmentSettings: AppointmentSettings = {
  timezone: "Europe/Istanbul",
  workDays: [1, 2, 3, 4, 5, 6],
  dayStart: "09:00",
  dayEnd: "18:00",
  slotMinutes: 60,
  bufferMinutes: 30,
  minNoticeHours: 4,
  maxAdvanceDays: 30,
  mode: "request",
  blockedDates: [],
  updatedAt: new Date(0).toISOString(),
};

const APPOINTMENT_STATUSES: AppointmentStatus[] = ["Talep Alındı", "Onaylandı", "İptal Edildi", "Tamamlandı", "Gelmedi"];
const WORK_DAYS = [
  { value: 1, label: "Pzt" }, { value: 2, label: "Sal" }, { value: 3, label: "Çar" },
  { value: 4, label: "Per" }, { value: 5, label: "Cum" }, { value: 6, label: "Cmt" }, { value: 0, label: "Paz" },
];

type HealthSnapshot = {
  status: "ready" | "configuration_required";
  environment: string;
  catalog: { readable: boolean; publishedListings: number; storage: string };
  settings: { readable: boolean };
  appointments: { readable: boolean };
  services: Record<string, boolean>;
};

type AuditEventSnapshot = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  requestId: string;
  createdAt: string;
  hash: string;
};

type ErrorEventSnapshot = {
  id: string;
  source: string;
  message: string;
  severity: "warning" | "error" | "critical";
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  resolved: boolean;
};

type OperationsSnapshot = {
  auditEvents: AuditEventSnapshot[];
  errorEvents: ErrorEventSnapshot[];
};

const SERVICE_LABELS: Record<string, string> = {
  admin_password: "Admin parolası",
  session_secret: "Oturum anahtarı",
  deepseek: "DeepSeek",
  elevenlabs: "ElevenLabs",
  portfolio_storage: "Portföy deposu",
  media_storage: "Görsel deposu",
  whatsapp: "WhatsApp",
  phone: "Telefon",
};


export function AdminPanel({ initialListings, initialSettings, initialLeads, initialAppointments, initialAppointmentSettings }: { initialListings: Listing[]; initialSettings: AdminSiteSettings; initialLeads: Lead[]; initialAppointments: Appointment[]; initialAppointmentSettings: AppointmentSettings | null }) {
  const router = useRouter();
  const [view, setView] = useState<"listings" | "settings" | "leads" | "writer" | "appointments" | "assistant" | "operations">("listings");
  const [listings, setListings] = useState(initialListings);
  const [leads, setLeads] = useState(initialLeads);
  const [leadsMessage, setLeadsMessage] = useState("");
  const [leadsBusy, setLeadsBusy] = useState(false);
  const [leadQuery, setLeadQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [matchingListing, setMatchingListing] = useState<Listing | null>(null);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [appointmentSettings, setAppointmentSettings] = useState(initialAppointmentSettings ?? fallbackAppointmentSettings);
  const [appointmentMessage, setAppointmentMessage] = useState("");
  const [appointmentBusy, setAppointmentBusy] = useState(false);
  const [writerPoints, setWriterPoints] = useState(["", "", ""]);
  const [writerPurpose, setWriterPurpose] = useState<ListingPurpose>("Satılık");
  const [writerPropertyType, setWriterPropertyType] = useState<PropertyType>("Villa");
  const [writerLocation, setWriterLocation] = useState("Ağva");
  const [writerResult, setWriterResult] = useState<ListingCopyResult | null>(null);
  const [writerBusy, setWriterBusy] = useState(false);
  const [writerMessage, setWriterMessage] = useState("");
  const [settings, setSettings] = useState(initialSettings);
  const [apiKey, setApiKey] = useState("");
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tümü");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ListingInput>(emptyForm);
  const [featuresText, setFeaturesText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [operations, setOperations] = useState<OperationsSnapshot | null>(null);
  const [operationsBusy, setOperationsBusy] = useState(false);
  const [operationsMessage, setOperationsMessage] = useState("");

  const weeklyLeads = useMemo(() => summarizeWeeklyLeads(leads), [leads]);
  const filteredLeads = useMemo(() => {
    const needle = leadQuery.toLocaleLowerCase("tr-TR").trim();
    if (!needle) return leads;
    return leads.filter((lead) => `${lead.name} ${lead.phone} ${lead.email} ${lead.region} ${lead.propertyType} ${lead.summary} ${lead.assignedAdvisor} ${lead.listingReferences.join(" ")}`.toLocaleLowerCase("tr-TR").includes(needle));
  }, [leadQuery, leads]);

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) ?? null, [leads, selectedLeadId]);

  const appointmentStats = useMemo(() => {
    const now = Date.now();
    const upcoming = appointments.filter((item) => Date.parse(item.startAt) >= now && !["İptal Edildi", "Gelmedi"].includes(item.status));
    const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return {
      upcoming: upcoming.length,
      pending: appointments.filter((item) => item.status === "Talep Alındı").length,
      today: upcoming.filter((item) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(item.startAt)) === todayKey).length,
      completed: appointments.filter((item) => item.status === "Tamamlandı").length,
    };
  }, [appointments]);

  const filtered = useMemo(() => listings.filter((item) => {
    const text = `${item.title} ${item.location} ${item.reference}`.toLocaleLowerCase("tr-TR");
    const matchesStatus = status === "Tümü" || (status === "Yayında" ? item.published : !item.published);
    return text.includes(query.toLocaleLowerCase("tr-TR")) && matchesStatus;
  }), [listings, query, status]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, images: [], features: [] });
    setFeaturesText("");
    setImageUrl("");
    setEditorOpen(true);
  };

  const openEdit = (listing: Listing) => {
    setEditingId(listing.id);
    setForm({ ...listing });
    setFeaturesText(listing.features.join(", "));
    setImageUrl("");
    setEditorOpen(true);
  };

  const updateField = <K extends keyof ListingInput>(key: K, value: ListingInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (!files.length) return;
    setMessage("Görseller yükleniyor...");
    const uploaded: string[] = [];
    for (const file of files) {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Görsel yüklenemedi.");
        return;
      }
      uploaded.push(payload.url);
    }
    updateField("images", [...form.images, ...uploaded]);
    setMessage(`${uploaded.length} görsel yüklendi. Toplam ${form.images.length + uploaded.length} görsel; ilk görsel kapak olarak kullanılacak.`);
  }

  function makeCover(image: string) {
    updateField("images", [image, ...form.images.filter((item) => item !== image)]);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload: ListingInput = {
      ...form,
      features: featuresText.split(",").map((item) => item.trim()).filter(Boolean),
      images: imageUrl.trim() ? [...form.images, imageUrl.trim()] : form.images,
    };
    if (payload.published && payload.images.length === 0) {
      setMessage("İlanı yayınlamak için en az bir görsel ekleyin. Fotoğrafsız olarak taslak kaydedebilirsiniz.");
      setSaving(false);
      return;
    }
    const response = await fetch(editingId ? `/api/admin/listings/${editingId}` : "/api/admin/listings", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "İlan kaydedilemedi.");
      setSaving(false);
      return;
    }
    setListings((current) => editingId ? current.map((item) => item.id === editingId ? result : item) : [result, ...current]);
    setSaving(false);
    setEditorOpen(false);
    setMessage(editingId ? "İlan güncellendi." : "Yeni ilan eklendi.");
  }

  async function remove(listing: Listing) {
    if (!window.confirm(`“${listing.title}” ilanı kalıcı olarak silinsin mi?`)) return;
    const response = await fetch(`/api/admin/listings/${listing.id}`, { method: "DELETE" });
    if (response.ok) {
      setListings((current) => current.filter((item) => item.id !== listing.id));
      setMessage("İlan silindi.");
    }
  }

  async function togglePublished(listing: Listing) {
    if (!listing.published && listing.images.length === 0) {
      setMessage("Bu ilanı yayınlamak için önce en az bir görsel ekleyin.");
      return;
    }
    const response = await fetch(`/api/admin/listings/${listing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !listing.published }),
    });
    const result = await response.json();
    if (response.ok) setListings((current) => current.map((item) => item.id === listing.id ? result : item));
  }

  async function refreshListings() {
    const response = await fetch("/api/admin/listings", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok && Array.isArray(payload)) {
      setListings(payload);
      return;
    }
    setMessage(payload?.error ?? "Portföy listesi yenilenemedi.");
  }

  async function refreshOperations() {
    setOperationsBusy(true);
    setOperationsMessage("");
    try {
      const [healthResponse, operationsResponse] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/admin/operations", { cache: "no-store" }),
      ]);
      const [healthPayload, operationsPayload] = await Promise.all([
        healthResponse.json(),
        operationsResponse.json(),
      ]);
      if (!operationsResponse.ok) throw new Error(operationsPayload?.error ?? "Sistem kayıtları yüklenemedi.");
      if (!healthPayload?.status || !healthPayload?.catalog || !healthPayload?.services) throw new Error("Sistem sağlığı yanıtı geçersiz.");
      setHealth(healthPayload);
      setOperations(operationsPayload);
    } catch (error) {
      setOperationsMessage(error instanceof Error ? error.message : "Sistem verileri yüklenemedi.");
    } finally {
      setOperationsBusy(false);
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(listings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ikisu-portfoy-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setSettingsSaving(true);
    setSettingsMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiEnabled: settings.aiEnabled,
          aiModel: settings.aiModel,
          assistantInstructions: settings.assistantInstructions,
          whatsappNumber: settings.whatsappNumber,
          phoneNumber: settings.phoneNumber,
          voiceEnabled: settings.voiceEnabled,
          elevenLabsVoiceId: settings.elevenLabsVoiceId,
          elevenLabsModel: settings.elevenLabsModel,
          voiceStability: settings.voiceStability,
          voiceSimilarity: settings.voiceSimilarity,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
          ...(elevenLabsApiKey.trim() ? { elevenLabsApiKey: elevenLabsApiKey.trim() } : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Ayarlar kaydedilemedi.");
      setSettings(payload);
      setApiKey("");
      setElevenLabsApiKey("");
      setSettingsMessage("Site ve yapay zekâ ayarları kaydedildi.");
      router.refresh();
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : "Ayarlar kaydedilemedi.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function testDeepSeek() {
    setSettingsSaving(true);
    setSettingsMessage("DeepSeek bağlantısı test ediliyor...");
    try {
      const response = await fetch("/api/admin/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiModel: settings.aiModel, ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Bağlantı testi başarısız.");
      setSettingsMessage(`DeepSeek bağlantısı başarılı · ${payload.model} · ${payload.latencyMs} ms`);
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : "Bağlantı testi başarısız.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function clearManagedApiKey() {
    if (!window.confirm("Admin panelinden kaydedilmiş DeepSeek anahtarı kaldırılsın mı? Ortam değişkenindeki anahtar varsa tekrar o kullanılır.")) return;
    setSettingsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clearApiKey: true }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "API anahtarı kaldırılamadı.");
      setSettings(payload);
      setApiKey("");
      setSettingsMessage("Yönetilen API anahtarı kaldırıldı.");
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : "API anahtarı kaldırılamadı.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function testElevenLabs() {
    setSettingsSaving(true);
    setSettingsMessage("Deniz sesi hazırlanıyor...");
    try {
      const response = await fetch("/api/admin/settings/voice-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: settings.elevenLabsVoiceId,
          model: settings.elevenLabsModel,
          stability: settings.voiceStability,
          similarity: settings.voiceSimilarity,
          ...(elevenLabsApiKey.trim() ? { apiKey: elevenLabsApiKey.trim() } : {}),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Ses bağlantısı test edilemedi.");
      }
      const latency = response.headers.get("X-Voice-Latency");
      const url = URL.createObjectURL(await response.blob());
      const audio = new Audio(url);
      audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
      audio.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
      await audio.play();
      setSettingsMessage(`ElevenLabs bağlantısı başarılı${latency ? ` · ${latency} ms` : ""} · Deniz sesi oynatılıyor.`);
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : "Ses bağlantısı test edilemedi.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function clearManagedElevenLabsApiKey() {
    if (!window.confirm("Admin panelinden kaydedilmiş ElevenLabs anahtarı kaldırılsın mı? Ortam değişkenindeki anahtar varsa tekrar o kullanılır.")) return;
    setSettingsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clearElevenLabsApiKey: true, voiceEnabled: false }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "ElevenLabs anahtarı kaldırılamadı.");
      setSettings(payload);
      setElevenLabsApiKey("");
      setSettingsMessage("Yönetilen ElevenLabs anahtarı kaldırıldı ve sesli yanıt kapatıldı.");
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : "ElevenLabs anahtarı kaldırılamadı.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function refreshLeads() {
    setLeadsBusy(true);
    try {
      const response = await fetch("/api/admin/leads", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Talepler yüklenemedi.");
      setLeads(payload);
      setLeadsMessage("");
    } catch (error) {
      setLeadsMessage(error instanceof Error ? error.message : "Talepler yüklenemedi.");
    } finally {
      setLeadsBusy(false);
    }
  }

  async function removeLead(lead: Lead) {
    if (!window.confirm(`${lead.name || lead.phone} talebini silmek istediğinize emin misiniz?`)) return;
    setLeadsBusy(true);
    try {
      const response = await fetch("/api/admin/leads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Talep silinemedi.");
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      if (selectedLeadId === lead.id) setSelectedLeadId(null);
      setLeadsMessage("Talep silindi.");
    } catch (error) {
      setLeadsMessage(error instanceof Error ? error.message : "Talep silinemedi.");
    } finally {
      setLeadsBusy(false);
    }
  }

  function leadWhatsappLink(lead: Lead) {
    let digits = lead.phone.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = `9${digits}`;
    if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
    const text = encodeURIComponent("Merhaba, İKİSU Emlak portföy danışmanınızım. Sitemizdeki talebiniz hakkında yazıyorum.");
    return `https://wa.me/${digits}?text=${text}`;
  }

  async function changeLeadStage(lead: Lead, stage: LeadStage) {
    if (lead.stage === stage) return;
    setLeadsBusy(true);
    setLeadsMessage("");
    try {
      const response = await fetch("/api/admin/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, stage }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "CRM durumu güncellenemedi.");
      setLeads((current) => current.map((item) => item.id === lead.id ? payload : item));
      setLeadsMessage(`${lead.name || lead.phone} · ${stage} olarak güncellendi.`);
    } catch (error) {
      setLeadsMessage(error instanceof Error ? error.message : "CRM durumu güncellenemedi.");
    } finally {
      setLeadsBusy(false);
    }
  }

  async function refreshAppointments() {
    setAppointmentBusy(true);
    setAppointmentMessage("");
    try {
      const [appointmentsResponse, settingsResponse] = await Promise.all([
        fetch("/api/admin/appointments", { cache: "no-store" }),
        fetch("/api/admin/appointment-settings", { cache: "no-store" }),
      ]);
      const appointmentPayload = await appointmentsResponse.json();
      const settingsPayload = await settingsResponse.json();
      if (!appointmentsResponse.ok) throw new Error(appointmentPayload?.error ?? "Randevular yüklenemedi.");
      if (!settingsResponse.ok) throw new Error(settingsPayload?.error ?? "Takvim ayarları yüklenemedi.");
      setAppointments(appointmentPayload);
      setAppointmentSettings(settingsPayload);
    } catch (error) {
      setAppointmentMessage(error instanceof Error ? error.message : "Randevular yüklenemedi.");
    } finally {
      setAppointmentBusy(false);
    }
  }

  async function changeAppointmentStatus(appointment: Appointment, status: AppointmentStatus) {
    if (appointment.status === status) return;
    setAppointmentBusy(true);
    setAppointmentMessage("");
    try {
      const response = await fetch("/api/admin/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appointment.id, status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Randevu güncellenemedi.");
      setAppointments((current) => current.map((item) => item.id === appointment.id ? payload : item));
      setAppointmentMessage(`${appointment.customerName} · ${status} olarak güncellendi.`);
    } catch (error) {
      setAppointmentMessage(error instanceof Error ? error.message : "Randevu güncellenemedi.");
    } finally {
      setAppointmentBusy(false);
    }
  }

  async function removeAppointment(appointment: Appointment) {
    if (!window.confirm(`${appointment.customerName} randevusu kalıcı olarak silinsin mi?`)) return;
    setAppointmentBusy(true);
    try {
      const response = await fetch("/api/admin/appointments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: appointment.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Randevu silinemedi.");
      setAppointments((current) => current.filter((item) => item.id !== appointment.id));
      setAppointmentMessage("Randevu silindi.");
    } catch (error) {
      setAppointmentMessage(error instanceof Error ? error.message : "Randevu silinemedi.");
    } finally {
      setAppointmentBusy(false);
    }
  }

  async function saveAppointmentCalendarSettings(event: FormEvent) {
    event.preventDefault();
    setAppointmentBusy(true);
    setAppointmentMessage("");
    try {
      const response = await fetch("/api/admin/appointment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentSettings),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Takvim ayarları kaydedilemedi.");
      setAppointmentSettings(payload);
      setAppointmentMessage("Randevu takvimi ayarları kaydedildi.");
    } catch (error) {
      setAppointmentMessage(error instanceof Error ? error.message : "Takvim ayarları kaydedilemedi.");
    } finally {
      setAppointmentBusy(false);
    }
  }

  function formatAppointmentDate(value: string) {
    return new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }

  function fillWriterExample() {
    setWriterLocation("Ağva Kurfallı");
    setWriterPurpose("Satılık");
    setWriterPropertyType("Villa");
    setWriterPoints([
      "Orman manzaralı, geniş bahçeli ve müstakil yaşam sunan villa",
      "Şömine, veranda ve araç park alanı bulunan kullanışlı plan",
      "Doğayla iç içe sakin konum; hafta sonu ve sürekli yaşam için uygun",
    ]);
    setWriterResult(null);
    setWriterMessage("Örnek maddeler dolduruldu. Üret düğmesiyle akışı test edebilirsiniz.");
  }

  async function generateWriterCopy() {
    if (writerPoints.some((point) => !point.trim())) {
      setWriterMessage("Üç maddenin tamamını doldurun.");
      return;
    }
    setWriterBusy(true);
    setWriterMessage("İlan metni hazırlanıyor...");
    setWriterResult(null);
    try {
      const response = await fetch("/api/admin/assistant/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: writerPoints, purpose: writerPurpose, propertyType: writerPropertyType, location: writerLocation }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "İlan metni üretilemedi.");
      setWriterResult(payload);
      setWriterMessage(payload.source === "deepseek" ? "DeepSeek çıktısı hazır." : "API anahtarı bulunmadığı için güvenli yerel taslak üretildi.");
    } catch (error) {
      setWriterMessage(error instanceof Error ? error.message : "İlan metni üretilemedi.");
    } finally {
      setWriterBusy(false);
    }
  }

  async function copyWriterText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setWriterMessage(`${label} kopyalandı.`);
    } catch {
      setWriterMessage("Tarayıcı kopyalama izni vermedi. Metni seçerek kopyalayabilirsiniz.");
    }
  }

  function applyWriterToListing() {
    if (!writerResult) return;
    setEditingId(null);
    setForm({
      ...emptyForm,
      title: writerResult.title,
      slug: writerResult.slug,
      purpose: writerPurpose,
      propertyType: writerPropertyType,
      location: writerLocation,
      description: writerResult.description,
      seoTitle: writerResult.seoTitle,
      metaDescription: writerResult.metaDescription,
      keywords: writerResult.keywords,
      images: [],
      features: [],
      published: false,
    });
    setFeaturesText("");
    setImageUrl("");
    setView("listings");
    setEditorOpen(true);
    setMessage("İlan yazarı çıktısı yeni ilan formuna aktarıldı. Fiyat ve görselleri ekleyip taslak olarak kaydedebilirsiniz.");
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/"><span>İK</span><div><strong>İKİSU</strong><small>EMLAK YÖNETİMİ</small></div></a>
        <nav><button className={view === "listings" ? "active" : ""} type="button" onClick={() => { setView("listings"); setEditorOpen(false); }}>▦ Portföy</button><button className={view === "leads" ? "active" : ""} type="button" onClick={() => { setView("leads"); setEditorOpen(false); void refreshLeads(); }}>☎ CRM hattı{leads.length > 0 ? ` (${leads.length})` : ""}</button><button className={view === "appointments" ? "active" : ""} type="button" onClick={() => { setView("appointments"); setEditorOpen(false); void refreshAppointments(); }}>▣ Randevular{appointmentStats.pending > 0 ? ` (${appointmentStats.pending})` : ""}</button><button className={view === "writer" ? "active" : ""} type="button" onClick={() => { setView("writer"); setEditorOpen(false); }}>✦ İlan & SEO yazarı</button><button className={view === "assistant" ? "active" : ""} type="button" onClick={() => { setView("assistant"); setEditorOpen(false); }}>✦ Yönetici AI</button><button className={view === "operations" ? "active" : ""} type="button" onClick={() => { setView("operations"); setEditorOpen(false); void refreshOperations(); }}>◉ Sistem durumu</button><button className={view === "settings" ? "active" : ""} type="button" onClick={() => { setView("settings"); setEditorOpen(false); }}>⚙ Site ve AI ayarları</button><a href="/" target="_blank" rel="noreferrer">↗ Siteyi görüntüle</a></nav>
        <div className="admin-sidebar-foot"><button type="button" onClick={logout}>Oturumu kapat</button></div>
      </aside>

      <section className={`admin-main ${view !== "listings" ? "admin-view-hidden" : ""}`}>
        <header className="admin-topbar"><div><span>PORTFÖY YÖNETİMİ</span><h1>İlanlar</h1></div><button className="admin-primary" type="button" onClick={openNew}>+ Yeni ilan ekle</button></header>
        {message && <div className="admin-message">{message}<button type="button" onClick={() => setMessage("")}>×</button></div>}

        <div className="admin-stats">
          <article><span>Toplam portföy</span><strong>{listings.length}</strong></article>
          <article><span>Yayındaki ilan</span><strong>{listings.filter((item) => item.published).length}</strong></article>
          <article><span>Taslak</span><strong>{listings.filter((item) => !item.published).length}</strong></article>
          <article><span>Acil portföy</span><strong>{listings.filter((item) => item.urgent).length}</strong></article>
        </div>

        <div className="admin-toolbar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="İlan, bölge veya referans ara..." />
          <select value={status} onChange={(event) => setStatus(event.target.value)}><option>Tümü</option><option>Yayında</option><option>Taslak</option></select>
          <button type="button" onClick={exportData}>JSON dışa aktar</button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>İlan</th><th>Tür</th><th>Fiyat</th><th>Durum</th><th>Güncelleme</th><th /></tr></thead>
            <tbody>{filtered.map((listing) => (
              <tr key={listing.id}>
                <td><div className="admin-listing-cell">{listing.images[0] ? <img src={listing.images[0]} alt="" /> : <span className="admin-listing-no-image">Fotoğraf yok</span>}<div><strong>{listing.title}</strong><span>{listing.reference} · {listing.location}</span></div></div></td>
                <td><strong>{listing.purpose}</strong><span>{listing.propertyType}</span></td>
                <td><div className="admin-price-cell">{listing.oldPrice > listing.price && <del>{new Intl.NumberFormat("tr-TR").format(listing.oldPrice)} TL</del>}<strong>{formatPrice(listing)}</strong>{listing.urgent && <span className="admin-urgent-pill">Çok acil</span>}</div></td>
                <td><button className={listing.published ? "status-pill published" : "status-pill"} type="button" onClick={() => togglePublished(listing)}>{listing.published ? "Yayında" : "Taslak"}</button></td>
                <td>{new Date(listing.updatedAt).toLocaleDateString("tr-TR")}</td>
                <td><div className="admin-row-actions"><button type="button" onClick={() => setMatchingListing(listing)}>Eşleşmeler</button><button type="button" onClick={() => openEdit(listing)}>Düzenle</button><button className="danger" type="button" onClick={() => remove(listing)}>Sil</button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      {view === "leads" && <section className="admin-main crm-page">
        <header className="admin-topbar"><div><span>HAFTALIK SATIŞ HATTI</span><h1>CRM hattı</h1></div><button className="admin-primary" type="button" disabled={leadsBusy} onClick={() => void refreshLeads()}>{leadsBusy ? "Yükleniyor..." : "↻ Yenile"}</button></header>
        {leadsMessage && <div className="admin-message">{leadsMessage}<button type="button" onClick={() => setLeadsMessage("")}>×</button></div>}
        <div className="crm-weekly-summary">
          <article><span>Bu hafta yeni</span><strong>{weeklyLeads.newThisWeek}</strong><small>{new Date(weeklyLeads.weekStart).toLocaleDateString("tr-TR")} tarihinden beri</small></article>
          <article><span>Bu hafta satıldı</span><strong>{weeklyLeads.soldThisWeek}</strong><small>Satıldı aşamasına geçenler</small></article>
          <article><span>Haftalık dönüşüm</span><strong>%{weeklyLeads.conversion}</strong><small>Bu haftaki yeni talepten satışa</small></article>
          <article><span>Aktif talepler</span><strong>{leads.filter((lead) => lead.stage !== "Satıldı").length}</strong><small>Satış dışında kalan kayıtlar</small></article>
        </div>
        <div className="crm-funnel" aria-label="Haftalık dönüşüm özeti">{LEAD_STAGES.map((stage) => <div key={stage}><span>{stage}</span><strong>{weeklyLeads.reached[stage]}</strong></div>)}</div>
        <div className="admin-toolbar crm-toolbar"><input value={leadQuery} onChange={(event) => setLeadQuery(event.target.value)} placeholder="Ad, telefon, bölge, ilan veya ihtiyaç ara..." /><span>{filteredLeads.length} talep</span></div>
        {leads.length === 0 ? (
          <div className="admin-message">Henüz kayıtlı müşteri talebi yok. Yapay zekâ danışmanı, ziyaretçi telefon numarasını paylaştığında talebi otomatik olarak Yeni aşamasına ekler.</div>
        ) : (
          <div className="crm-board">{LEAD_STAGES.map((stage, stageIndex) => {
            const stageLeads = filteredLeads.filter((lead) => lead.stage === stage);
            return <section className="crm-column" key={stage}>
              <header><div><span>{stageIndex + 1}</span><strong>{stage}</strong></div><em>{stageLeads.length}</em></header>
              <div className="crm-column-body">{stageLeads.length === 0 ? <p className="crm-empty">Bu aşamada kayıt yok.</p> : stageLeads.map((lead) => <article className="crm-card" key={lead.id}>
                <div className="crm-card-head"><div><strong>{lead.name || "İsim alınamadı"}</strong><a href={`tel:${lead.phone}`}>{lead.phone}</a></div><div className="crm-card-badges">{lead.temperature !== "Belirsiz" && <span data-temperature={lead.temperature}>{lead.temperature}</span>}{lead.kind === "randevu" && <span>Randevu</span>}</div></div>
                {lead.summary && <p>{lead.summary}</p>}
                <dl><div><dt>İhtiyaç</dt><dd>{[lead.budget, lead.region, lead.propertyType].filter(Boolean).join(" · ") || "Detay verilmedi"}</dd></div><div><dt>İlanlar</dt><dd>{lead.listingReferences.length ? lead.listingReferences.join(", ") : "—"}</dd></div><div><dt>Güncelleme</dt><dd>{new Date(lead.stageUpdatedAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}</dd></div></dl>
                <label><span>Durum</span><select value={lead.stage} disabled={leadsBusy} onChange={(event) => void changeLeadStage(lead, event.target.value as LeadStage)}>{LEAD_STAGES.map((item) => <option key={item}>{item}</option>)}</select></label>
                <div className="crm-card-actions"><button type="button" onClick={() => setSelectedLeadId(lead.id)}>Müşteri kartı</button><a href={leadWhatsappLink(lead)} target="_blank" rel="noreferrer">WhatsApp</a><a href={`tel:${lead.phone}`}>Ara</a></div>
                <div className="crm-stage-actions"><button type="button" disabled={leadsBusy || stageIndex === 0} onClick={() => void changeLeadStage(lead, LEAD_STAGES[stageIndex - 1])}>← Geri</button><button type="button" disabled={leadsBusy || stageIndex === LEAD_STAGES.length - 1} onClick={() => void changeLeadStage(lead, LEAD_STAGES[stageIndex + 1])}>İleri →</button><button className="danger" type="button" disabled={leadsBusy} onClick={() => void removeLead(lead)}>Sil</button></div>
              </article>)}</div>
            </section>;
          })}</div>
        )}
      </section>}

      {view === "appointments" && <section className="admin-main appointment-admin-page">
        <header className="admin-topbar"><div><span>RANDEVU OPERASYONU</span><h1>Randevular</h1></div><button className="admin-primary" type="button" disabled={appointmentBusy} onClick={() => void refreshAppointments()}>{appointmentBusy ? "Yükleniyor..." : "↻ Yenile"}</button></header>
        {appointmentMessage && <div className="admin-message">{appointmentMessage}<button type="button" onClick={() => setAppointmentMessage("")}>×</button></div>}
        <div className="appointment-admin-stats">
          <article><span>Bugün</span><strong>{appointmentStats.today}</strong><small>Planlanan aktif randevu</small></article>
          <article><span>Onay bekliyor</span><strong>{appointmentStats.pending}</strong><small>Talep alındı durumunda</small></article>
          <article><span>Yaklaşan</span><strong>{appointmentStats.upcoming}</strong><small>İptal edilmemiş gelecek kayıtlar</small></article>
          <article><span>Tamamlandı</span><strong>{appointmentStats.completed}</strong><small>Gerçekleşen görüşmeler</small></article>
        </div>
        <div className="appointment-admin-layout">
          <section className="appointment-admin-list">
            <header><div><span>RANDEVU LİSTESİ</span><h2>Takvim kayıtları</h2></div><small>{appointments.length} kayıt</small></header>
            {appointments.length === 0 ? <div className="appointment-admin-empty">Henüz randevu yok. İlan sayfasındaki “Takvimden randevu al” düğmesi veya yapay zekâ sohbeti üzerinden ilk test randevusunu oluşturabilirsiniz.</div> : <div className="appointment-admin-cards">{[...appointments].sort((a, b) => a.startAt.localeCompare(b.startAt)).map((appointment) => <article key={appointment.id}>
              <div className="appointment-admin-time"><span>{formatAppointmentDate(appointment.startAt)}</span><strong>{appointment.status}</strong></div>
              <h3>{appointment.customerName}</h3>
              <a href={`tel:${appointment.phone}`}>{appointment.phone}</a>
              <p>{appointment.listingReference} · {appointment.listingTitle}</p>
              {appointment.note && <small>{appointment.note}</small>}
              <label><span>Durum</span><select value={appointment.status} disabled={appointmentBusy} onChange={(event) => void changeAppointmentStatus(appointment, event.target.value as AppointmentStatus)}>{APPOINTMENT_STATUSES.map((statusItem) => <option key={statusItem}>{statusItem}</option>)}</select></label>
              <div><a href={`tel:${appointment.phone}`}>Ara</a><button className="danger" type="button" disabled={appointmentBusy} onClick={() => void removeAppointment(appointment)}>Sil</button></div>
            </article>)}</div>}
          </section>
          <form className="appointment-settings-card" onSubmit={saveAppointmentCalendarSettings}>
            <header><span>TAKVİM AYARLARI</span><h2>Çalışma düzeni</h2><p>Müşteriye yalnız bu kurallara göre gerçekten boş saatler gösterilir.</p></header>
            <div className="appointment-work-days">{WORK_DAYS.map((day) => <label key={day.value}><input type="checkbox" checked={appointmentSettings.workDays.includes(day.value)} onChange={(event) => setAppointmentSettings((current) => ({ ...current, workDays: event.target.checked ? [...new Set([...current.workDays, day.value])] : current.workDays.filter((item) => item !== day.value) }))} /><span>{day.label}</span></label>)}</div>
            <div className="appointment-settings-grid">
              <label><span>Başlangıç</span><input type="time" value={appointmentSettings.dayStart} onChange={(event) => setAppointmentSettings((current) => ({ ...current, dayStart: event.target.value }))} /></label>
              <label><span>Bitiş</span><input type="time" value={appointmentSettings.dayEnd} onChange={(event) => setAppointmentSettings((current) => ({ ...current, dayEnd: event.target.value }))} /></label>
              <label><span>Randevu süresi</span><input type="number" min="15" max="180" step="15" value={appointmentSettings.slotMinutes} onChange={(event) => setAppointmentSettings((current) => ({ ...current, slotMinutes: Number(event.target.value) }))} /></label>
              <label><span>Ara süre</span><input type="number" min="0" max="120" step="15" value={appointmentSettings.bufferMinutes} onChange={(event) => setAppointmentSettings((current) => ({ ...current, bufferMinutes: Number(event.target.value) }))} /></label>
              <label><span>En erken (saat)</span><input type="number" min="0" max="168" value={appointmentSettings.minNoticeHours} onChange={(event) => setAppointmentSettings((current) => ({ ...current, minNoticeHours: Number(event.target.value) }))} /></label>
              <label><span>İleri rezervasyon (gün)</span><input type="number" min="1" max="180" value={appointmentSettings.maxAdvanceDays} onChange={(event) => setAppointmentSettings((current) => ({ ...current, maxAdvanceDays: Number(event.target.value) }))} /></label>
              <label className="span-2"><span>Onay biçimi</span><select value={appointmentSettings.mode} onChange={(event) => setAppointmentSettings((current) => ({ ...current, mode: event.target.value === "instant" ? "instant" : "request" }))}><option value="request">Talep al · danışman onaylasın</option><option value="instant">Anında onayla</option></select></label>
              <label className="span-2"><span>Kapalı tarihler</span><input value={appointmentSettings.blockedDates.join(", ")} onChange={(event) => setAppointmentSettings((current) => ({ ...current, blockedDates: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} placeholder="2026-07-20, 2026-07-21" /><small>YYYY-AA-GG biçiminde virgülle ayırın.</small></label>
            </div>
            <button className="admin-primary" type="submit" disabled={appointmentBusy}>{appointmentBusy ? "Kaydediliyor..." : "Takvim ayarlarını kaydet"}</button>
          </form>
        </div>
      </section>}

      {view === "writer" && <section className="admin-main writer-page">
        <header className="admin-topbar"><div><span>DEEPSEEK İÇERİK MOTORU</span><h1>İlan & SEO yazarı</h1></div><button className="admin-primary" type="button" onClick={fillWriterExample}>Örnekle doldur</button></header>
        {writerMessage && <div className="admin-message">{writerMessage}<button type="button" onClick={() => setWriterMessage("")}>×</button></div>}
        <div className="writer-layout">
          <section className="writer-input-card">
            <header><span>3 MADDE GİRİN</span><h2>Taşınmazın gerçek güçlü yanları</h2><p>Yalnız bildiğiniz somut bilgileri yazın. Sistem verilmeyen fiyat, mesafe veya tapu bilgisi üretmez.</p></header>
            <div className="writer-context-grid"><label><span>İşlem</span><select value={writerPurpose} onChange={(event) => setWriterPurpose(event.target.value as ListingPurpose)}><option>Satılık</option><option>Kiralık</option></select></label><label><span>Emlak tipi</span><select value={writerPropertyType} onChange={(event) => setWriterPropertyType(event.target.value as PropertyType)}>{["Villa", "Müstakil Ev", "Daire", "Arsa", "Ticari"].map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Bölge</span><input value={writerLocation} onChange={(event) => setWriterLocation(event.target.value)} placeholder="Ağva / Şile" /></label></div>
            <div className="writer-points">{writerPoints.map((point, index) => <label key={index}><span>{index + 1}. madde</span><textarea rows={4} maxLength={500} value={point} onChange={(event) => setWriterPoints((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={index === 0 ? "En güçlü özellik" : index === 1 ? "Plan, donanım veya kullanım avantajı" : "Konum ve yaşam senaryosu"} /><small>{point.length}/500</small></label>)}</div>
            <button className="admin-primary writer-generate" type="button" disabled={writerBusy} onClick={() => void generateWriterCopy()}>{writerBusy ? "Hazırlanıyor..." : "DeepSeek ile üret"}</button>
          </section>
          <section className="writer-output-card">
            {!writerResult ? <div className="writer-placeholder"><span>✦</span><h2>Çıktı burada görünecek</h2><p>Profesyonel başlık, ilan açıklaması, SEO başlığı, meta açıklaması, anahtar kelimeler ve URL hazırlanır.</p></div> : <>
              <header><div><span>{writerResult.source === "deepseek" ? "DEEPSEEK ÇIKTISI" : "YEREL GÜVENLİ TASLAK"}</span><h2>Yayınlanabilir içerik</h2></div><button type="button" onClick={applyWriterToListing}>Yeni ilana aktar</button></header>
              <div className="writer-output-field"><div><span>İlan başlığı</span><small>{writerResult.title.length}/110</small></div><strong>{writerResult.title}</strong><button type="button" onClick={() => void copyWriterText(writerResult.title, "İlan başlığı")}>Kopyala</button></div>
              <div className="writer-output-field"><div><span>İlan açıklaması</span><small>{writerResult.description.length}/2400</small></div><p>{writerResult.description}</p><button type="button" onClick={() => void copyWriterText(writerResult.description, "İlan açıklaması")}>Kopyala</button></div>
              <div className="writer-output-field"><div><span>SEO başlığı</span><small>{writerResult.seoTitle.length}/60</small></div><strong>{writerResult.seoTitle}</strong><button type="button" onClick={() => void copyWriterText(writerResult.seoTitle, "SEO başlığı")}>Kopyala</button></div>
              <div className="writer-output-field"><div><span>Meta açıklaması</span><small>{writerResult.metaDescription.length}/155</small></div><p>{writerResult.metaDescription}</p><button type="button" onClick={() => void copyWriterText(writerResult.metaDescription, "Meta açıklaması")}>Kopyala</button></div>
              <div className="writer-output-field"><div><span>Anahtar kelimeler</span></div><p>{writerResult.keywords.join(", ")}</p><button type="button" onClick={() => void copyWriterText(writerResult.keywords.join(", "), "Anahtar kelimeler")}>Kopyala</button></div>
              <div className="writer-output-field"><div><span>SEO URL</span></div><code>/ilan/{writerResult.slug}</code><button type="button" onClick={() => void copyWriterText(writerResult.slug, "SEO URL")}>Kopyala</button></div>
            </>}
          </section>
        </div>
      </section>}

      {view === "operations" && <section className="admin-main operations-page">
        <header className="admin-topbar"><div><span>OPERASYON GÖRÜNÜRLÜĞÜ</span><h1>Sistem durumu</h1></div><button className="admin-primary" type="button" disabled={operationsBusy} onClick={() => void refreshOperations()}>{operationsBusy ? "Yükleniyor..." : "Sistem verilerini yenile"}</button></header>
        {operationsMessage && <div className="admin-message operations-error">{operationsMessage}<button type="button" onClick={() => setOperationsMessage("")}>×</button></div>}
        <div className="operations-stats">
          <article data-status={health?.status === "ready" ? "ok" : "attention"}><span>Genel sağlık</span><strong>{health ? health.status === "ready" ? "Hazır" : "Yapılandırma gerekli" : "—"}</strong><small>{health?.environment ?? "Henüz kontrol edilmedi"}</small></article>
          <article data-status={health?.catalog.readable ? "ok" : "attention"}><span>Portföy erişimi</span><strong>{health ? health.catalog.readable ? "Okunuyor" : "Erişilemiyor" : "—"}</strong><small>{health ? `${health.catalog.publishedListings} yayındaki ilan · ${health.catalog.storage}` : "Veri bekleniyor"}</small></article>
          <article data-status={(operations?.errorEvents.filter((event) => !event.resolved).length ?? 0) === 0 ? "ok" : "attention"}><span>Açık hata</span><strong>{operations ? operations.errorEvents.filter((event) => !event.resolved).length : "—"}</strong><small>Maskelenmiş ve gruplanmış olaylar</small></article>
          <article><span>Denetim olayı</span><strong>{operations?.auditEvents.length ?? "—"}</strong><small>Son 100 hash zincirli kayıt</small></article>
        </div>

        {!health && !operations && operationsBusy ? <div className="operations-loading">Sistem sağlığı ve operasyon kayıtları yükleniyor...</div> : <div className="operations-layout">
          <section className="operations-card operations-health">
            <header><div><span>CANLI KONTROLLER</span><h2>Servis ve veri kaynakları</h2></div><small>{health?.status === "ready" ? "Tüm zorunlu kontroller hazır" : "Eksik yapılandırmaları inceleyin"}</small></header>
            {!health ? <p className="operations-empty">Sistem sağlığı henüz kontrol edilmedi.</p> : <div className="operations-checks">
              <div data-status={health.catalog.readable ? "ok" : "missing"}><span>Portföy verisi</span><strong>{health.catalog.readable ? "Hazır" : "Erişilemiyor"}</strong></div>
              <div data-status={health.settings.readable ? "ok" : "missing"}><span>Site ayarları</span><strong>{health.settings.readable ? "Hazır" : "Erişilemiyor"}</strong></div>
              <div data-status={health.appointments.readable ? "ok" : "missing"}><span>Randevu takvimi</span><strong>{health.appointments.readable ? "Hazır" : "Erişilemiyor"}</strong></div>
              {Object.entries(health.services).map(([key, configured]) => <div data-status={configured ? "ok" : "missing"} key={key}><span>{SERVICE_LABELS[key] ?? key}</span><strong>{configured ? "Yapılandırıldı" : "Eksik / kapalı"}</strong></div>)}
            </div>}
          </section>

          <section className="operations-card operations-errors">
            <header><div><span>MASKELENMİŞ TEKNİK KAYIT</span><h2>Hata olayları</h2></div><small>{operations?.errorEvents.length ?? 0} olay</small></header>
            {!operations ? <p className="operations-empty">Hata olayları henüz yüklenmedi.</p> : operations.errorEvents.length === 0 ? <p className="operations-empty">Kayıtlı hata olayı yok.</p> : <div className="operations-event-list">{operations.errorEvents.map((event) => <article data-severity={event.severity} key={event.id}>
              <header><strong>{event.source}</strong><span>{event.severity === "warning" ? "Uyarı" : event.severity === "critical" ? "Kritik" : "Hata"}</span></header>
              <p>{event.message}</p>
              <footer><span>Son görülme: {new Date(event.lastSeenAt).toLocaleString("tr-TR")}</span><strong>{event.occurrenceCount} kez</strong></footer>
            </article>)}</div>}
          </section>

          <section className="operations-card operations-audit">
            <header><div><span>DEĞİŞTİRMEYE DAYANIKLI İZ</span><h2>Denetim kayıtları</h2></div><small>{operations?.auditEvents.length ?? 0} olay</small></header>
            {!operations ? <p className="operations-empty">Denetim kayıtları henüz yüklenmedi.</p> : operations.auditEvents.length === 0 ? <p className="operations-empty">Kayıtlı denetim olayı yok.</p> : <div className="operations-event-list">{operations.auditEvents.map((event) => <article key={event.id}>
              <header><strong>{event.action}</strong><span>{new Date(event.createdAt).toLocaleString("tr-TR")}</span></header>
              <p>{event.actor} · {event.entityType} · {event.entityId}</p>
              {Object.keys(event.details).length > 0 && <code>{JSON.stringify(event.details)}</code>}
              <footer><span>İstek: {event.requestId.slice(0, 8)}</span><strong>Hash: {event.hash.slice(0, 12)}</strong></footer>
            </article>)}</div>}
          </section>
        </div>}
      </section>}

      {view === "settings" && <section className="admin-main admin-settings-page">
        <header className="admin-topbar"><div><span>SİTE VE ENTEGRASYONLAR</span><h1>Ayarlar</h1></div><a className="admin-primary" href="/" target="_blank" rel="noreferrer">Siteyi kontrol et</a></header>
        {settingsMessage && <div className="admin-message">{settingsMessage}<button type="button" onClick={() => setSettingsMessage("")}>×</button></div>}
        <form className="admin-settings-form" onSubmit={saveSettings}>
          <section className="admin-settings-card">
            <header><div><span>YAPAY ZEKÂ</span><h2>DeepSeek kontrolü</h2></div><strong className={settings.aiEnabled ? "settings-status on" : "settings-status"}>{settings.aiEnabled ? "Aktif" : "Kapalı"}</strong></header>
            <p>API anahtarı sunucuda AES-256-GCM ile şifrelenir ve hiçbir zaman tarayıcıya geri gönderilmez.</p>
            <div className="admin-settings-grid">
              <label className="check-field span-2"><input type="checkbox" checked={settings.aiEnabled} onChange={(event) => setSettings((current) => ({ ...current, aiEnabled: event.target.checked }))} /><span>Yapay zekâ danışmanını aktif tut</span></label>
              <label><span>DeepSeek modeli</span><input value={settings.aiModel} onChange={(event) => setSettings((current) => ({ ...current, aiModel: event.target.value }))} placeholder="deepseek-v4-flash" /></label>
              <label><span>Yeni API anahtarı</span><input type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={settings.hasApiKey ? `Anahtar mevcut · ${settings.apiKeySource === "managed" ? "admin ayarı" : "ortam değişkeni"}` : "sk-..."} /></label>
              <label className="span-2"><span>AI davranış talimatı</span><textarea rows={5} maxLength={1500} value={settings.assistantInstructions} onChange={(event) => setSettings((current) => ({ ...current, assistantInstructions: event.target.value }))} placeholder="Örneğin: Önce bütçe ve bölgeyi sor; yanıtları kısa tut." /><small>{settings.assistantInstructions.length}/1500 · Güvenlik ve doğruluk kuralları değiştirilemez.</small></label>
            </div>
            <div className="admin-settings-actions"><button type="button" disabled={settingsSaving} onClick={() => void testDeepSeek()}>Bağlantıyı test et</button>{settings.apiKeySource === "managed" && <button className="danger" type="button" disabled={settingsSaving} onClick={() => void clearManagedApiKey()}>Yönetilen anahtarı kaldır</button>}</div>
          </section>

          <section className="admin-settings-card">
            <header><div><span>DOĞAL SES</span><h2>ElevenLabs sesli danışman</h2></div><strong className={settings.voiceEnabled ? "settings-status on" : "settings-status"}>{settings.voiceEnabled ? "Aktif" : "Kapalı"}</strong></header>
            <p>Asistan yanıtlarını doğal bir Türkçe kadın sesiyle okur. Varsayılan ses Deniz’dir. API anahtarı DeepSeek anahtarı gibi sunucuda şifreli saklanır ve tarayıcıya geri gönderilmez.</p>
            <div className="admin-settings-grid">
              <label className="check-field span-2"><input type="checkbox" checked={settings.voiceEnabled} onChange={(event) => setSettings((current) => ({ ...current, voiceEnabled: event.target.checked }))} /><span>Sesli yanıt özelliğini aktif tut</span></label>
              <label><span>Ses kimliği</span><input value={settings.elevenLabsVoiceId} onChange={(event) => setSettings((current) => ({ ...current, elevenLabsVoiceId: event.target.value }))} placeholder="KAGDtM2gzDrjWlUp2KNe" /><small>Varsayılan: Deniz · genç, sıcak ve doğal Türkçe ton</small></label>
              <label><span>ElevenLabs modeli</span><select value={settings.elevenLabsModel} onChange={(event) => setSettings((current) => ({ ...current, elevenLabsModel: event.target.value }))}><option value="eleven_flash_v2_5">Flash v2.5 · hızlı</option><option value="eleven_multilingual_v2">Multilingual v2 · dengeli</option><option value="eleven_v3">Eleven v3 · en etkileyici</option></select></label>
              <label><span>Kararlılık · %{Math.round(settings.voiceStability * 100)}</span><input type="range" min="0" max="1" step="0.05" value={settings.voiceStability} onChange={(event) => setSettings((current) => ({ ...current, voiceStability: Number(event.target.value) }))} /></label>
              <label><span>Ses benzerliği · %{Math.round(settings.voiceSimilarity * 100)}</span><input type="range" min="0" max="1" step="0.05" value={settings.voiceSimilarity} onChange={(event) => setSettings((current) => ({ ...current, voiceSimilarity: Number(event.target.value) }))} /></label>
              <label className="span-2"><span>Yeni ElevenLabs API anahtarı</span><input type="password" autoComplete="new-password" value={elevenLabsApiKey} onChange={(event) => setElevenLabsApiKey(event.target.value)} placeholder={settings.hasElevenLabsApiKey ? `Anahtar mevcut · ${settings.elevenLabsApiKeySource === "managed" ? "admin ayarı" : "ortam değişkeni"}` : "sk_..."} /><small>Test düğmesi, henüz kaydetmediğiniz anahtarı da güvenli biçimde deneyebilir.</small></label>
            </div>
            <div className="admin-settings-actions"><button type="button" disabled={settingsSaving} onClick={() => void testElevenLabs()}>Deniz sesini dinle ve test et</button>{settings.elevenLabsApiKeySource === "managed" && <button className="danger" type="button" disabled={settingsSaving} onClick={() => void clearManagedElevenLabsApiKey()}>Yönetilen ses anahtarını kaldır</button>}</div>
          </section>

          <section className="admin-settings-card">
            <header><div><span>İLETİŞİM</span><h2>WhatsApp ve arama</h2></div></header>
            <p>Numaraları ülke koduyla yalnız rakam olarak girin. Alanı boş bırakırsanız ilgili buton güvenli biçimde pasif kalır.</p>
            <div className="admin-settings-grid">
              <label><span>WhatsApp numarası</span><input inputMode="tel" value={settings.whatsappNumber} onChange={(event) => setSettings((current) => ({ ...current, whatsappNumber: event.target.value }))} placeholder="905551112233" /></label>
              <label><span>Arama numarası</span><input inputMode="tel" value={settings.phoneNumber} onChange={(event) => setSettings((current) => ({ ...current, phoneNumber: event.target.value }))} placeholder="905551112233" /></label>
            </div>
          </section>
          <footer className="admin-settings-save"><span>Son güncelleme: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString("tr-TR") : "Henüz kaydedilmedi"}</span><button className="admin-primary" type="submit" disabled={settingsSaving}>{settingsSaving ? "İşleniyor..." : "Tüm ayarları kaydet"}</button></footer>
        </form>
      </section>}

      {view === "assistant" && <section className="admin-main admin-settings-page">
        <header className="admin-topbar"><div><span>MEVCUT PORTFÖY YÖNETİMİ</span><h1>Yönetici AI</h1></div></header>
        <div className="admin-settings-card">
          <header><div><span>DOĞRUDAN ERİŞİM</span><h2>AI ile ilan yönetin</h2></div></header>
          <p>Mevcut admin oturumunuzla yeni ilan ekleyebilir; IKS referansını yazarak bir ilanı düzenleyebilir, yayın durumunu değiştirebilir veya silme onayı hazırlayabilirsiniz. Kaydetme ve silme işlemleri mevcut sunucu yetkisini ve açık onay adımlarını kullanır.</p>
        </div>
        <AIConcierge adminAccess initiallyOpen onListingsChanged={() => { void refreshListings(); }} />
      </section>}

      {matchingListing && <ListingMatchesModal
        listing={matchingListing}
        onClose={() => setMatchingListing(null)}
        onOpenCustomer={(leadId) => { setMatchingListing(null); setSelectedLeadId(leadId); }}
      />}

      {selectedLead && <CustomerCardModal
        lead={selectedLead}
        listings={listings}
        appointments={appointments}
        onClose={() => setSelectedLeadId(null)}
        onUpdated={(updated) => setLeads((current) => current.map((item) => item.id === updated.id ? updated : item))}
      />}

      {view === "listings" && editorOpen && (
        <div className="admin-editor" role="dialog" aria-modal="true" aria-label={editingId ? "İlan düzenle" : "Yeni ilan ekle"}>
          <button className="admin-editor-backdrop" type="button" onClick={() => setEditorOpen(false)} aria-label="Kapat" />
          <form className="admin-editor-panel" onSubmit={save}>
            <header><div><span>{editingId ? "İLAN DÜZENLE" : "YENİ PORTFÖY"}</span><h2>{editingId ? "Portföy bilgileri" : "Yeni ilan ekle"}</h2></div><button type="button" onClick={() => setEditorOpen(false)}>×</button></header>
            <div className="admin-form-grid">
              <label className="span-2"><span>İlan başlığı *</span><input value={form.title} onChange={(event) => updateField("title", event.target.value)} required /></label>
              <label><span>İşlem türü *</span><select value={form.purpose} onChange={(event) => updateField("purpose", event.target.value as ListingPurpose)}><option>Satılık</option><option>Kiralık</option></select></label>
              <label><span>Emlak tipi *</span><select value={form.propertyType} onChange={(event) => updateField("propertyType", event.target.value as PropertyType)}>{["Villa", "Müstakil Ev", "Daire", "Arsa", "Ticari"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>Bölge *</span><input value={form.location} onChange={(event) => updateField("location", event.target.value)} required /></label>
              <label><span>İlçe / İl</span><input value={form.district} onChange={(event) => updateField("district", event.target.value)} /></label>
              <label><span>Fiyat *</span><input type="number" min="0" value={form.price} onChange={(event) => updateField("price", Number(event.target.value))} required /></label>
              <label><span>Eski fiyat</span><input type="number" min="0" value={form.oldPrice} onChange={(event) => updateField("oldPrice", Number(event.target.value))} /><small>Fiyat indirimi yoksa 0 bırakın.</small></label>
              <label><span>Para birimi</span><select value={form.currency} onChange={(event) => updateField("currency", event.target.value as ListingInput["currency"])}><option value="TRY">TL</option><option value="USD">USD</option><option value="EUR">EUR</option></select></label>
              <label><span>Oda</span><input value={form.rooms} onChange={(event) => updateField("rooms", event.target.value)} /></label>
              <label><span>Banyo</span><input type="number" min="0" value={form.bathrooms} onChange={(event) => updateField("bathrooms", Number(event.target.value))} /></label>
              <label><span>Brüt m²</span><input type="number" min="0" value={form.grossArea} onChange={(event) => updateField("grossArea", Number(event.target.value))} /></label>
              <label><span>Net m²</span><input type="number" min="0" value={form.netArea} onChange={(event) => updateField("netArea", Number(event.target.value))} /></label>
              <label><span>Arsa m²</span><input type="number" min="0" value={form.landArea} onChange={(event) => updateField("landArea", Number(event.target.value))} /></label>
              <label><span>Kat</span><input value={form.floor} onChange={(event) => updateField("floor", event.target.value)} /></label>
              <label className="span-2"><span>Açıklama</span><textarea rows={7} maxLength={2400} value={form.description} onChange={(event) => updateField("description", event.target.value)} /><small>{form.description.length}/2400</small></label>
              <label className="span-2"><span>SEO başlığı</span><input maxLength={60} value={form.seoTitle} onChange={(event) => updateField("seoTitle", event.target.value)} placeholder="Arama sonucunda görünecek başlık" /><small>{form.seoTitle.length}/60</small></label>
              <label className="span-2"><span>Meta açıklaması</span><textarea rows={3} maxLength={155} value={form.metaDescription} onChange={(event) => updateField("metaDescription", event.target.value)} placeholder="Arama sonucunda görünecek kısa açıklama" /><small>{form.metaDescription.length}/155</small></label>
              <label><span>SEO URL</span><input value={form.slug} onChange={(event) => updateField("slug", event.target.value)} placeholder="agva-satilik-villa" /></label>
              <label><span>Anahtar kelimeler</span><input value={form.keywords.join(", ")} onChange={(event) => updateField("keywords", event.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8))} placeholder="Ağva villa, Şile emlak" /></label>
              <label className="span-2"><span>Özellikler — virgülle ayırın</span><input value={featuresText} onChange={(event) => setFeaturesText(event.target.value)} placeholder="Şömine, nehir manzarası, otopark" /></label>
              <label className="span-2"><span>Görsel URL</span><input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://... veya /uploads/..." /></label>
              <label className="span-2 upload-field"><span>Bir veya birden fazla görsel yükle</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadImages} /><small>Birden fazla dosyayı birlikte seçebilirsiniz · JPG, PNG veya WebP · Görsel başına en fazla 8 MB · İlk görsel kapak olur</small></label>
              {form.images.length > 0 && <div className="admin-image-previews span-2">{form.images.map((image, index) => <div key={`${image}-${index}`}><span>{index === 0 ? "Kapak" : index + 1}</span><img src={image} alt={`İlan görseli ${index + 1}`} /><div><button type="button" disabled={index === 0} onClick={() => makeCover(image)}>Kapak yap</button><button type="button" onClick={() => updateField("images", form.images.filter((item) => item !== image))}>Sil</button></div></div>)}</div>}
              <label className="check-field"><input type="checkbox" checked={form.featured} onChange={(event) => updateField("featured", event.target.checked)} /><span>Öne çıkar</span></label>
              <label className="check-field urgent-check"><input type="checkbox" checked={form.urgent} onChange={(event) => updateField("urgent", event.target.checked)} /><span>Çok acil etiketi</span></label>
              <label className="check-field"><input type="checkbox" checked={form.published} onChange={(event) => updateField("published", event.target.checked)} /><span>Hemen yayınla</span></label>
            </div>
            <footer><button type="button" onClick={() => setEditorOpen(false)}>Vazgeç</button><button className="admin-primary" type="submit" disabled={saving}>{saving ? "Kaydediliyor..." : editingId ? "Değişiklikleri kaydet" : "İlanı kaydet"}</button></footer>
          </form>
        </div>
      )}
    </main>
  );
}
