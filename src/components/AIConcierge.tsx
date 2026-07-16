"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import type { ListingInput } from "@/lib/types";

type ListingAction = { type: "open_listing"; reference: string; title: string; href: string };
type AdminDraft = Partial<ListingInput>;
type AdminMode = "public" | "awaiting_password" | "ready" | "drafting";
type Message = { role: "user" | "assistant"; content: string; actions?: ListingAction[]; adminDraft?: AdminDraft };
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

export function AIConcierge({ listing }: { listing?: ListingContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [adminMode, setAdminMode] = useState<AdminMode>("public");
  const [adminDraft, setAdminDraft] = useState<AdminDraft | null>(null);
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
        content: "Yönetici modu güvenli biçimde açıldı. “İlan ekle” yazın; bilgileri konuşarak taslağa dönüştüreyim.",
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
    setAdminMode("drafting");
    setMessages((current) => [...current,
      { role: "user", content: "ilan ekle" },
      {
        role: "assistant",
        content: "Elbette. İlanı doğal bir cümleyle anlatın. Başlık, satılık/kiralık, emlak tipi, bölge ve fiyat zorunlu; oda, m², açıklama, özellikler, eski fiyat ve “çok acil” bilgisini de aynı mesajda yazabilirsiniz.",
      },
    ]);
  }

  async function refineListingDraft(instruction: string) {
    setInput("");
    setError("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: instruction }]);
    try {
      const response = await fetch("/api/admin/assistant/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, draft: adminDraft }),
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
      }]);
    } catch {
      setError("İlan taslağı hazırlanırken bağlantı kurulamadı.");
    } finally {
      setLoading(false);
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
      const response = await fetch("/api/admin/listings", {
        method: "POST",
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
      setMessages((current) => [...current, {
        role: "assistant",
        content: published
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
        content: `${uploaded.length} görsel ilan taslağına eklendi.`,
      }]);
    } catch {
      setError("Görseller yüklenirken bağlantı kurulamadı.");
    } finally {
      setSavingDraft(false);
    }
  }

  function cancelListingDraft() {
    setAdminDraft(null);
    setAdminMode("ready");
    setMessages((current) => [...current, { role: "assistant", content: "İlan taslağını iptal ettim. Herhangi bir kayıt yapılmadı." }]);
  }

  async function leaveAdminMode() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    setAdminMode("public");
    setAdminDraft(null);
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
                  <div className="ai-admin-draft-title"><span>YENİ İLAN TASLAĞI</span><strong>{message.adminDraft.title}</strong></div>
                  <dl>
                    <div><dt>İşlem</dt><dd>{message.adminDraft.purpose}</dd></div>
                    <div><dt>Tür</dt><dd>{message.adminDraft.propertyType}</dd></div>
                    <div><dt>Bölge</dt><dd>{message.adminDraft.location}</dd></div>
                    <div><dt>Fiyat</dt><dd>{formatDraftPrice(message.adminDraft)}</dd></div>
                    {(message.adminDraft.rooms || message.adminDraft.grossArea) && <div><dt>Detay</dt><dd>{[message.adminDraft.rooms, message.adminDraft.grossArea ? `${message.adminDraft.grossArea} brüt m²` : ""].filter(Boolean).join(" · ")}</dd></div>}
                    {message.adminDraft.urgent && <div><dt>Etiket</dt><dd>Çok acil</dd></div>}
                  </dl>
                  {message.adminDraft.description && <p>{message.adminDraft.description}</p>}
                  {message.adminDraft.images && message.adminDraft.images.length > 0 && <div className="ai-admin-draft-images">{message.adminDraft.images.map((image) => <img src={image} alt="İlan taslağı" key={image} />)}</div>}
                  <small>{message.adminDraft.images?.length ? "Düzeltmek istediğiniz bilgiyi mesaj olarak yazabilirsiniz." : "Fotoğrafsız ilan yayınlanamaz; isterseniz fotoğrafsız taslak kaydedebilirsiniz."}</small>
                  {message.adminDraft === adminDraft && <label className={`ai-admin-upload ${message.adminDraft.images?.length ? "has-images" : "required"}`}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={savingDraft} onChange={(event) => void uploadDraftImages(event, message.adminDraft!)} />
                    <span>＋</span><div><strong>{message.adminDraft.images?.length ? "Başka fotoğraf ekle" : "Fotoğraf yükle"}</strong><small>JPG, PNG veya WebP · Görsel başına en fazla 8 MB</small></div>
                  </label>}
                  {message.adminDraft === adminDraft && <div className="ai-admin-draft-actions">
                    <button type="button" disabled={savingDraft} onClick={() => void saveListingDraft(message.adminDraft!, false)}>Taslak kaydet</button>
                    <button type="button" disabled={savingDraft || !message.adminDraft.images?.length} onClick={() => void saveListingDraft(message.adminDraft!, true)}>Hemen yayınla</button>
                    <button type="button" disabled={savingDraft} onClick={cancelListingDraft}>İptal</button>
                  </div>}
                </div>}
              </div>
            ))}
            {loading && <div className="ai-message assistant typing"><i /><i /><i /></div>}
            {redirecting && <div className="ai-redirecting"><span /> İlan sayfası hazırlanıyor…</div>}
            {error && <div className="ai-error">{error}</div>}
            <div ref={messagesEndRef} />
          </div>
          {messages.length === 0 && <div className="ai-suggestions">{contextualSuggestions.map((item) => <button type="button" key={item} onClick={() => void ask(item)}>{item}</button>)}</div>}
          {adminMode === "ready" && <div className="ai-suggestions ai-admin-actions"><button type="button" onClick={beginListingDraft}>+ Yeni ilan ekle</button><button type="button" onClick={() => void leaveAdminMode()}>Oturumu kapat</button></div>}
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
