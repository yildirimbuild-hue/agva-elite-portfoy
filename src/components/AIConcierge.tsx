"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import type { Listing, ListingInput } from "@/lib/types";

type ListingAction = { type: "open_listing"; reference: string; title: string; href: string };
type AdminDraft = Partial<ListingInput>;
type AdminMode = "public" | "awaiting_password" | "ready" | "drafting";
type AdminTarget = Pick<Listing, "id" | "reference" | "title" | "slug" | "published">;
type Message = { role: "user" | "assistant"; content: string; actions?: ListingAction[]; adminDraft?: AdminDraft; adminDraftKind?: "create" | "edit"; adminDelete?: AdminTarget };
type ListingContext = { reference: string; title: string };

const suggestions = [
  "Nehir kenarında villa arıyorum",
  "10 milyon TL altındaki ilanlar",
  "Yatırım için hangi arsalar uygun?",
];

function normalizeCommand(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
}

function formatDraftPrice(draft: AdminDraft) {
  if (!draft.price) return "Fiyat bekleniyor";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency", currency: draft.currency ?? "TRY", maximumFractionDigits: 0,
  }).format(draft.price);
}

function toAdminDraft(source: Listing): AdminDraft {
  return {
    title: source.title, purpose: source.purpose, propertyType: source.propertyType,
    location: source.location, district: source.district, price: source.price,
    oldPrice: source.oldPrice, currency: source.currency, rooms: source.rooms,
    bathrooms: source.bathrooms, grossArea: source.grossArea, netArea: source.netArea,
    landArea: source.landArea, floor: source.floor, description: source.description,
    features: [...source.features], images: [...source.images], featured: source.featured,
    urgent: source.urgent, published: source.published, isDemo: false,
  };
}

export function AIConcierge({ listing }: { listing?: ListingContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [adminMode, setAdminMode] = useState<AdminMode>("public");
  const [adminDraft, setAdminDraft] = useState<AdminDraft | null>(null);
  const [editingTarget, setEditingTarget] = useState<AdminTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminTarget | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const redirectTimerRef = useRef<number | null>(null);
  const userHandledRef = useRef(false);

  const contextualSuggestions = listing ? [
    "Bu ilanın öne çıkan özellikleri neler?",
    "Fiyat avantajını açıklar mısın?",
    "Bu ilana benzer seçenekler göster",
  ] : suggestions;

  const greeting = listing
    ? `${listing.reference} numaralı “${listing.title}” ilanını inceliyorsunuz. Fiyatı, özellikleri veya benzer seçenekler hakkında yardımcı olmamı ister misiniz?`
    : "Merhaba. Bütçenizi, aradığınız bölgeyi veya emlak tipini yazın; güncel portföyden uygun seçenekleri bulayım.";

  const adminActive = adminMode === "ready" || adminMode === "drafting";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, error, redirecting]);

  useEffect(() => () => {
    if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
  }, []);

  useEffect(() => {
    if (!listing) return;
    const storageKey = `ikisu-ai-offer:${listing.reference}`;
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
    } catch {
      // Session storage engellense bile zamanlama çalışmaya devam eder.
    }

    let engaged = false;
    let ready = false;
    let finished = false;

    const remember = () => {
      try { window.sessionStorage.setItem(storageKey, "shown"); } catch { /* no-op */ }
    };
    const offerHelp = () => {
      if (finished || userHandledRef.current || document.visibilityState !== "visible") return;
      finished = true;
      remember();
      setOpen(true);
    };
    const markEngaged = () => {
      engaged = true;
      if (ready) offerHelp();
    };
    const onScroll = () => {
      if (window.scrollY > 140) markEngaged();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && ready && engaged) offerHelp();
    };

    const softTimer = window.setTimeout(() => {
      ready = true;
      if (engaged) offerHelp();
    }, 14000);
    const readingTimer = window.setTimeout(offerHelp, 30000);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", markEngaged, { passive: true });
    window.addEventListener("keydown", markEngaged);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(softTimer);
      window.clearTimeout(readingTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", markEngaged);
      window.removeEventListener("keydown", markEngaged);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [listing]);

  function handlePanel(openPanel: boolean) {
    userHandledRef.current = true;
    if (listing) {
      try { window.sessionStorage.setItem(`ikisu-ai-offer:${listing.reference}`, "handled"); } catch { /* no-op */ }
    }
    setOpen(openPanel);
  }

  async function enterAdminMode() {
    setInput("");
    setError("");
    setLoading(true);
    setMessages([{ role: "user", content: "admin" }]);
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("Oturum sıfırlanamadı.");
      setAdminMode("awaiting_password");
      setMessages((current) => [...current, {
        role: "assistant",
        content: "Yönetici modunu açmak için lütfen admin şifrenizi girin. Şifreniz sohbet geçmişine veya yapay zekâ modeline gönderilmez.",
      }]);
    } catch {
      setAdminMode("public");
      setError("Güvenli yönetici girişi hazırlanamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  async function authenticateAdmin(password: string) {
    setInput("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Şifre doğrulanamadı.");
        return;
      }
      setAdminMode("ready");
      setMessages((current) => [...current, {
        role: "assistant",
        content: "Yönetici modu güvenli biçimde açıldı. Yeni ilan ekleyebilir; bulunduğunuz ilanı düzenleyebilir, fiyatını veya açıklamasını değiştirebilir, fotoğraf ekleyebilir, yayından kaldırabilir ya da silme onayı hazırlayabilirsiniz.",
      }]);
    } catch {
      setError("Yönetici oturumu açılamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  function beginListingDraft() {
    setInput("");
    setAdminDraft(null);
    setEditingTarget(null);
    setPendingDelete(null);
    setAdminMode("drafting");
    setMessages((current) => [...current,
      { role: "user", content: "ilan ekle" },
      {
        role: "assistant",
        content: "Elbette. İlanı doğal bir cümleyle anlatın. Başlık, satılık/kiralık, emlak tipi, bölge ve fiyat zorunlu; oda, m², açıklama, özellikler, eski fiyat ve “çok acil” bilgisini de aynı mesajda yazabilirsiniz. Ardından bir veya birden fazla fotoğrafı birlikte yükleyebilirsiniz.",
      },
    ]);
  }

  async function refineListingDraft(instruction: string, baseDraft: AdminDraft | null = adminDraft, kind: "create" | "edit" = editingTarget ? "edit" : "create", appendUser = true) {
    setInput("");
    setError("");
    setLoading(true);
    if (appendUser) setMessages((current) => [...current, { role: "user", content: instruction }]);
    try {
      const response = await fetch("/api/admin/assistant/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, draft: baseDraft, mode: kind }),
      });
      const payload = await response.json();
      if (response.status === 401) {
        setAdminMode("awaiting_password");
        setAdminDraft(null);
        setMessages((current) => [...current, { role: "assistant", content: "Yönetici oturumunuz sona erdi. Devam etmek için şifrenizi tekrar girin." }]);
        return;
      }
      if (!response.ok) {
        setError(payload.error ?? "İlan taslağı hazırlanamadı.");
        return;
      }
      const nextDraft = payload.draft as AdminDraft;
      setAdminDraft(nextDraft);
      setMessages((current) => [...current, {
        role: "assistant",
        content: payload.answer,
        adminDraft: payload.missing?.length ? undefined : nextDraft,
        adminDraftKind: kind,
      }]);
    } catch {
      setError("İlan taslağı hazırlanırken bağlantı kurulamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function resolveAdminListing(command: string) {
    const response = await fetch("/api/admin/listings", { cache: "no-store" });
    if (response.status === 401) {
      setAdminMode("awaiting_password");
      setMessages((current) => [...current, { role: "assistant", content: "Yönetici oturumunuz sona erdi. Devam etmek için şifrenizi tekrar girin." }]);
      return null;
    }
    const records = await response.json();
    if (!response.ok) throw new Error(records.error ?? "İlanlar alınamadı.");
    const explicitReference = command.match(/IKS-?\d{4}/i)?.[0]?.toUpperCase().replace("IKS", "IKS-").replace("--", "-");
    const targetReference = explicitReference ?? listing?.reference;
    if (!targetReference) return null;
    return (records as Listing[]).find((item) => item.reference === targetReference) ?? null;
  }

  async function beginEditingListing(instruction: string) {
    setInput("");
    setError("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: instruction }]);
    try {
      const source = await resolveAdminListing(instruction);
      if (!source) {
        setMessages((current) => [...current, { role: "assistant", content: "Düzenlemek istediğiniz ilanın IKS referans numarasını yazın veya ilan sayfasındayken “bu ilanı düzenle” deyin." }]);
        return;
      }
      const target: AdminTarget = { id: source.id, reference: source.reference, title: source.title, slug: source.slug, published: source.published };
      const draft = toAdminDraft(source);
      setEditingTarget(target);
      setPendingDelete(null);
      setAdminDraft(draft);
      setAdminMode("drafting");
      const normalized = normalizeCommand(instruction);
      const hasSpecificChange = ["fiyat", "baslik", "aciklama", "oda", "banyo", "metrekare", "m2", "bolge", "konum", "ozellik", "acil", "yayin", "kiralik", "satilik"].some((term) => normalized.includes(term)) &&
        ["degistir", "guncelle", "yap", "kaldir", "ekle", "olsun"].some((term) => normalized.includes(term));
      if (hasSpecificChange) {
        await refineListingDraft(instruction, draft, "edit", false);
      } else {
        setMessages((current) => [...current, {
          role: "assistant",
          content: `${source.reference} numaralı ilanı düzenlemeye açtım. Fiyat, başlık, açıklama, konum, alan, özellikler, etiketler veya yayın durumu dahil değiştirmek istediğiniz her şeyi yazabilirsiniz. Fotoğraf eklemek için karttaki çoklu yükleme alanını kullanın.`,
          adminDraft: draft,
          adminDraftKind: "edit",
        }]);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "İlan düzenlemeye açılamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function requestListingDelete(instruction: string) {
    setInput("");
    setError("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: instruction }]);
    try {
      const source = await resolveAdminListing(instruction);
      if (!source) {
        setMessages((current) => [...current, { role: "assistant", content: "Silmek istediğiniz ilanın IKS referans numarasını yazın veya ilgili ilan sayfasında bu komutu kullanın." }]);
        return;
      }
      const target: AdminTarget = { id: source.id, reference: source.reference, title: source.title, slug: source.slug, published: source.published };
      setPendingDelete(target);
      setMessages((current) => [...current, {
        role: "assistant",
        content: "Bu işlem kalıcıdır. Silmeden önce doğru ilanı kontrol edin.",
        adminDelete: target,
      }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Silme onayı hazırlanamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAdminListing(target: AdminTarget) {
    if (pendingDelete?.id !== target.id) return;
    setSavingDraft(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/listings/${target.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (response.status === 401) {
        setAdminMode("awaiting_password");
        setMessages((current) => [...current, { role: "assistant", content: "Oturumunuz sona erdi. Silme işlemi yapılmadı; devam etmek için şifrenizi tekrar girin." }]);
        return;
      }
      if (!response.ok) {
        setError(payload.error ?? "İlan silinemedi.");
        return;
      }
      setPendingDelete(null);
      setMessages((current) => [...current, { role: "assistant", content: `${target.reference} numaralı “${target.title}” ilanı kalıcı olarak silindi.` }]);
      if (listing?.reference === target.reference) {
        setRedirecting(true);
        redirectTimerRef.current = window.setTimeout(() => window.location.assign("/"), 1600);
      }
    } catch {
      setError("İlan silinirken bağlantı kurulamadı.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function saveListingDraft(draft: AdminDraft, published: boolean) {
    if (published && !(draft.images?.length)) {
      setError("İlanı yayınlamak için en az bir gerçek fotoğraf yükleyin. Fotoğrafsız olarak yalnız taslak kaydedebilirsiniz.");
      return;
    }
    setSavingDraft(true);
    setError("");
    try {
      const target = editingTarget;
      const response = await fetch(target ? `/api/admin/listings/${target.id}` : "/api/admin/listings", {
        method: target ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, published, isDemo: false }),
      });
      const payload = await response.json();
      if (response.status === 401) {
        setAdminMode("awaiting_password");
        setMessages((current) => [...current, { role: "assistant", content: "Oturumunuz sona erdi. Kaydetmeden önce şifrenizi tekrar girin." }]);
        return;
      }
      if (!response.ok) {
        setError(payload.error ?? "İlan kaydedilemedi.");
        return;
      }
      setAdminMode("ready");
      setAdminDraft(null);
      setEditingTarget(null);
      setMessages((current) => [...current, {
        role: "assistant",
        content: target
          ? `${payload.reference} numaralı ilan başarıyla güncellendi${published ? " ve yayında" : " ve taslakta"}.`
          : published
            ? `${payload.reference} numaralı ilan başarıyla yayınlandı.`
            : `${payload.reference} numaralı ilan taslak olarak kaydedildi.`,
        actions: published ? [{ type: "open_listing", reference: payload.reference, title: payload.title, href: `/ilan/${payload.slug}` }] : undefined,
      }]);
    } catch {
      setError("İlan kaydedilirken bağlantı kurulamadı.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function uploadDraftImages(event: ChangeEvent<HTMLInputElement>, draft: AdminDraft) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length) return;
    setSavingDraft(true);
    setError("");
    const uploaded: string[] = [];
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/admin/upload", { method: "POST", body });
        const payload = await response.json();
        if (response.status === 401) {
          setAdminMode("awaiting_password");
          setMessages((current) => [...current, { role: "assistant", content: "Oturumunuz sona erdi. Görsel yüklemek için şifrenizi tekrar girin." }]);
          return;
        }
        if (!response.ok) {
          setError(payload.error ?? "Görsel yüklenemedi.");
          return;
        }
        uploaded.push(payload.url);
      }
      const nextDraft = { ...draft, images: [...(draft.images ?? []), ...uploaded] };
      setAdminDraft(nextDraft);
      setMessages((current) => [...current.map((message) => message.adminDraft === draft ? { ...message, adminDraft: nextDraft } : message), {
        role: "assistant",
        content: `${uploaded.length} yeni görsel eklendi. İlanda toplam ${nextDraft.images?.length ?? 0} görsel var; ilk görsel kapak olarak kullanılır.`,
      }]);
    } catch {
      setError("Görseller yüklenirken bağlantı kurulamadı.");
    } finally {
      setSavingDraft(false);
    }
  }

  function updateDraftImages(draft: AdminDraft, images: string[]) {
    const nextDraft = { ...draft, images };
    setAdminDraft(nextDraft);
    setMessages((current) => current.map((message) => message.adminDraft === draft ? { ...message, adminDraft: nextDraft } : message));
  }

  function makeDraftCover(draft: AdminDraft, image: string) {
    updateDraftImages(draft, [image, ...(draft.images ?? []).filter((item) => item !== image)]);
  }

  function removeDraftImage(draft: AdminDraft, image: string) {
    updateDraftImages(draft, (draft.images ?? []).filter((item) => item !== image));
  }

  function cancelListingDraft() {
    setAdminDraft(null);
    setEditingTarget(null);
    setAdminMode("ready");
    setMessages((current) => [...current, { role: "assistant", content: "İşlemi iptal ettim. Herhangi bir kayıt veya değişiklik yapılmadı." }]);
  }

  async function leaveAdminMode() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    setAdminMode("public");
    setAdminDraft(null);
    setEditingTarget(null);
    setPendingDelete(null);
    setMessages([{ role: "assistant", content: "Yönetici oturumu güvenli biçimde kapatıldı." }]);
  }

  async function ask(content: string) {
    const question = content.trim();
    if (!question || loading || redirecting) return;
    const command = normalizeCommand(question);
    if (adminMode === "awaiting_password") {
      if (command === "iptal" || command === "vazgec") {
        setInput("");
        setAdminMode("public");
        setMessages([{ role: "assistant", content: "Yönetici girişi iptal edildi." }]);
        return;
      }
      await authenticateAdmin(question);
      return;
    }
    if (adminMode === "public" && (command === "admin" || command === "yonetici")) {
      await enterAdminMode();
      return;
    }
    if (adminActive && ["cikis", "admin cikis", "yonetici cikis", "oturumu kapat"].includes(command)) {
      setInput("");
      await leaveAdminMode();
      return;
    }
    if (adminMode === "ready" && (command.includes("ilan ekle") || command.includes("portfoy ekle") || command.includes("yeni ilan"))) {
      beginListingDraft();
      return;
    }
    if (adminMode === "ready" && pendingDelete && (command === "iptal" || command === "vazgec")) {
      setInput("");
      setPendingDelete(null);
      setMessages((current) => [...current, { role: "assistant", content: "Silme işlemini iptal ettim; ilan korunuyor." }]);
      return;
    }
    const hasListingReference = /IKS-?\d{4}/i.test(question);
    const fieldRemoval = ["foto", "gorsel", "resim", "aciklama", "ozellik", "etiket"].some((term) => command.includes(term));
    const deleteRequest = (command.includes("sil") || command.includes("kalici kaldir")) &&
      (command.includes("ilan") || command.includes("portfoy") || hasListingReference || Boolean(listing)) &&
      !command.includes("yayindan") && !fieldRemoval;
    if (adminMode === "ready" && deleteRequest) {
      await requestListingDelete(question);
      return;
    }
    const editVerb = ["duzenle", "degistir", "guncelle", "yap", "ekle", "kaldir", "sil"].some((term) => command.includes(term));
    const editSubject = ["ilan", "portfoy", "fiyat", "baslik", "aciklama", "foto", "gorsel", "oda", "banyo", "metrekare", "konum", "bolge", "ozellik", "acil", "yayin"].some((term) => command.includes(term));
    if (adminMode === "ready" && editVerb && editSubject && (hasListingReference || Boolean(listing))) {
      await beginEditingListing(question);
      return;
    }
    if (adminMode === "drafting") {
      if (command === "iptal" || command === "vazgec") {
        setInput("");
        cancelListingDraft();
        return;
      }
      await refineListingDraft(question);
      return;
    }
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context: listing ? { listingReference: listing.reference } : undefined }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.setupRequired
          ? "DeepSeek bağlantısı hazır; hizmete almak için sunucuya API anahtarı eklenmeli."
          : payload.error ?? "Danışmana ulaşılamadı.");
        return;
      }
      const answer = { role: "assistant" as const, content: payload.answer, actions: payload.actions as ListingAction[] | undefined };
      setMessages((current) => [...current, answer]);
      if (payload.autoOpen && payload.actions?.[0]?.href) {
        setRedirecting(true);
        redirectTimerRef.current = window.setTimeout(() => {
          window.location.assign(payload.actions[0].href);
        }, 1600);
      }
    } catch {
      setError("Bağlantı kurulamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  return (
    <div className={`ai-concierge ${open ? "open" : ""}`}>
      {open && (
        <section className="ai-panel" aria-label="Yapay zekâ portföy danışmanı">
          <header>
            <div className="ai-avatar">{adminMode === "public" ? "AI" : "YK"}</div>
            <div><strong>{adminMode === "public" ? "Portföy danışmanı" : "Yönetici asistanı"}</strong><span>{adminMode === "awaiting_password" ? "Güvenli kimlik doğrulama" : adminActive ? "Güvenli yönetici modu" : listing ? `${listing.reference} · Bu ilana hâkim` : "DeepSeek · İKİSU portföyüne bağlı"}</span></div>
            <button type="button" onClick={() => handlePanel(false)} aria-label="Danışmanı kapat">×</button>
          </header>
          <div className="ai-messages" aria-live="polite">
            <div className="ai-message assistant">{greeting}</div>
            {messages.map((message, index) => (
              <div className={`ai-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
                {message.actions && message.actions.length > 0 && <div className="ai-listing-actions">{message.actions.map((action) => <a href={action.href} key={action.reference}><span>{action.reference}</span><strong>{action.title}</strong><em>İlanı aç →</em></a>)}</div>}
                {message.adminDraft && <div className="ai-admin-draft">
                  <div className="ai-admin-draft-title"><span>{message.adminDraftKind === "edit" ? `${editingTarget?.reference ?? "İLAN"} · DEĞİŞİKLİK TASLAĞI` : "YENİ İLAN TASLAĞI"}</span><strong>{message.adminDraft.title}</strong></div>
                  <dl>
                    <div><dt>İşlem</dt><dd>{message.adminDraft.purpose}</dd></div>
                    <div><dt>Tür</dt><dd>{message.adminDraft.propertyType}</dd></div>
                    <div><dt>Bölge</dt><dd>{message.adminDraft.location}</dd></div>
                    <div><dt>Fiyat</dt><dd>{formatDraftPrice(message.adminDraft)}</dd></div>
                    {Boolean(message.adminDraft.oldPrice) && <div><dt>Eski fiyat</dt><dd>{new Intl.NumberFormat("tr-TR").format(message.adminDraft.oldPrice!)} {message.adminDraft.currency ?? "TRY"}</dd></div>}
                    <div><dt>Yayın</dt><dd>{message.adminDraft.published ? "Yayında" : "Taslak"}</dd></div>
                    {(message.adminDraft.rooms || message.adminDraft.bathrooms) && <div><dt>Oda / banyo</dt><dd>{[message.adminDraft.rooms, message.adminDraft.bathrooms ? `${message.adminDraft.bathrooms} banyo` : ""].filter(Boolean).join(" · ")}</dd></div>}
                    {(message.adminDraft.grossArea || message.adminDraft.netArea || message.adminDraft.landArea) && <div><dt>Alanlar</dt><dd>{[message.adminDraft.grossArea ? `${message.adminDraft.grossArea} brüt` : "", message.adminDraft.netArea ? `${message.adminDraft.netArea} net` : "", message.adminDraft.landArea ? `${message.adminDraft.landArea} arsa` : ""].filter(Boolean).join(" · ")} m²</dd></div>}
                    {message.adminDraft.floor && <div><dt>Kat</dt><dd>{message.adminDraft.floor}</dd></div>}
                    {message.adminDraft.urgent && <div><dt>Etiket</dt><dd>Çok acil</dd></div>}
                  </dl>
                  {message.adminDraft.description && <p>{message.adminDraft.description}</p>}
                  {message.adminDraft.features && message.adminDraft.features.length > 0 && <div className="ai-admin-draft-features">{message.adminDraft.features.join(" · ")}</div>}
                  {message.adminDraft.images && message.adminDraft.images.length > 0 && <div className="ai-admin-draft-images">{message.adminDraft.images.map((image, imageIndex) => <div key={`${image}-${imageIndex}`}><span>{imageIndex === 0 ? "Kapak" : imageIndex + 1}</span><img src={image} alt={`İlan taslağı ${imageIndex + 1}`} />{message.adminDraft === adminDraft && <div><button type="button" disabled={imageIndex === 0 || savingDraft} onClick={() => makeDraftCover(message.adminDraft!, image)}>Kapak</button><button type="button" disabled={savingDraft} onClick={() => removeDraftImage(message.adminDraft!, image)}>Sil</button></div>}</div>)}</div>}
                  <small>{message.adminDraft.images?.length ? "Düzeltmek istediğiniz bilgiyi mesaj olarak yazabilirsiniz." : "Fotoğrafsız ilan yayınlanamaz; isterseniz fotoğrafsız taslak kaydedebilirsiniz."}</small>
                  {message.adminDraft === adminDraft && <label className={`ai-admin-upload ${message.adminDraft.images?.length ? "has-images" : "required"}`}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={savingDraft} onChange={(event) => void uploadDraftImages(event, message.adminDraft!)} />
                    <span>＋</span><div><strong>{message.adminDraft.images?.length ? "Bir veya daha fazla fotoğraf ekle" : "Bir veya daha fazla fotoğraf yükle"}</strong><small>Birlikte çoklu seçim yapabilirsiniz · JPG, PNG veya WebP · En fazla 8 MB</small></div>
                  </label>}
                  {message.adminDraft === adminDraft && <div className="ai-admin-draft-actions">
                    {message.adminDraftKind === "edit"
                      ? <><button type="button" disabled={savingDraft || Boolean(message.adminDraft.published && !message.adminDraft.images?.length)} onClick={() => void saveListingDraft(message.adminDraft!, Boolean(message.adminDraft!.published))}>Değişiklikleri kaydet</button><button type="button" disabled={savingDraft || Boolean(!message.adminDraft.published && !message.adminDraft.images?.length)} onClick={() => void saveListingDraft(message.adminDraft!, !message.adminDraft!.published)}>{message.adminDraft.published ? "Yayından kaldır" : "Yayınla"}</button></>
                      : <><button type="button" disabled={savingDraft} onClick={() => void saveListingDraft(message.adminDraft!, false)}>Taslak kaydet</button><button type="button" disabled={savingDraft || !message.adminDraft.images?.length} onClick={() => void saveListingDraft(message.adminDraft!, true)}>Hemen yayınla</button></>}
                    <button type="button" disabled={savingDraft} onClick={cancelListingDraft}>İptal</button>
                  </div>}
                </div>}
                {message.adminDelete && <div className="ai-admin-delete-card"><span>KALICI SİLME ONAYI</span><strong>{message.adminDelete.reference} · {message.adminDelete.title}</strong><p>İlan ve portföy kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.</p>{pendingDelete?.id === message.adminDelete.id && <div><button type="button" disabled={savingDraft} onClick={() => void deleteAdminListing(message.adminDelete!)}>Evet, kalıcı sil</button><button type="button" disabled={savingDraft} onClick={() => { setPendingDelete(null); setMessages((current) => [...current, { role: "assistant", content: "Silme işlemi iptal edildi; ilan korunuyor." }]); }}>Vazgeç</button></div>}</div>}
              </div>
            ))}
            {loading && <div className="ai-message assistant typing"><i /><i /><i /></div>}
            {redirecting && <div className="ai-redirecting"><span /> İlan sayfası hazırlanıyor…</div>}
            {error && <div className="ai-error">{error}</div>}
            <div ref={messagesEndRef} />
          </div>
          {messages.length === 0 && <div className="ai-suggestions">{contextualSuggestions.map((item) => <button type="button" key={item} onClick={() => void ask(item)}>{item}</button>)}</div>}
          {adminMode === "ready" && <div className="ai-suggestions ai-admin-actions"><button type="button" onClick={beginListingDraft}>+ Yeni ilan ekle</button>{listing && <button type="button" onClick={() => void beginEditingListing("bu ilanı düzenle")}>Bu ilanı düzenle</button>}{listing && <button className="danger" type="button" onClick={() => void requestListingDelete("bu ilanı sil")}>Bu ilanı sil</button>}<button type="button" onClick={() => void leaveAdminMode()}>Oturumu kapat</button></div>}
          <form onSubmit={submit}>
            <input
              type={adminMode === "awaiting_password" ? "password" : "text"}
              autoComplete={adminMode === "awaiting_password" ? "current-password" : "off"}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={adminMode === "awaiting_password" ? 256 : adminMode === "drafting" ? 3000 : 1200}
              placeholder={adminMode === "awaiting_password" ? "Admin şifresi" : adminMode === "drafting" ? "İlan bilgilerini veya düzeltmeyi yazın…" : adminActive ? "Örneğin: ilan ekle" : "Nasıl bir mülk arıyorsunuz?"}
              aria-label={adminMode === "awaiting_password" ? "Admin şifresi" : "Yapay zekâya sorunuz"}
              disabled={redirecting || savingDraft}
            />
            <button type="submit" disabled={loading || redirecting || savingDraft || !input.trim()} aria-label="Soruyu gönder">↑</button>
          </form>
          <small>{adminMode === "awaiting_password" ? "Şifre yalnız güvenli giriş servisine gönderilir; AI modeline aktarılmaz." : adminActive ? "Hiçbir ilan son yönetici onayı olmadan kaydedilmez." : "Yanıtlar bilgilendirme amaçlıdır; güncel bilgi danışmanla doğrulanır."}</small>
        </section>
      )}
      <button className="ai-launcher" type="button" onClick={() => handlePanel(!open)} aria-expanded={open}>
        <span>✦</span><div><strong>{adminActive ? "Yönetici AI" : "AI Danışman"}</strong><small>{adminActive ? "Portföy yönetin" : listing ? "Bu ilanı sorun" : "Portföye sorun"}</small></div>
      </button>
    </div>
  );
}
