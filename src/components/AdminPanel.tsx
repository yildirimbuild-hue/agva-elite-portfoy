"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminSiteSettings, Listing, ListingInput, ListingPurpose, PropertyType } from "@/lib/types";

const emptyForm: ListingInput = {
  title: "",
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
  features: [],
  images: [],
  featured: false,
  urgent: false,
  published: true,
  isDemo: false,
};

const formatPrice = (listing: Listing) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: listing.currency, maximumFractionDigits: 0 }).format(listing.price);

export function AdminPanel({ initialListings, initialSettings }: { initialListings: Listing[]; initialSettings: AdminSiteSettings }) {
  const router = useRouter();
  const [view, setView] = useState<"listings" | "settings">("listings");
  const [listings, setListings] = useState(initialListings);
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

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/"><span>İK</span><div><strong>İKİSU</strong><small>EMLAK YÖNETİMİ</small></div></a>
        <nav><button className={view === "listings" ? "active" : ""} type="button" onClick={() => { setView("listings"); setEditorOpen(false); }}>▦ Portföy</button><button className={view === "settings" ? "active" : ""} type="button" onClick={() => { setView("settings"); setEditorOpen(false); }}>⚙ Site ve AI ayarları</button><a href="/" target="_blank" rel="noreferrer">↗ Siteyi görüntüle</a></nav>
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
                <td><div className="admin-row-actions"><button type="button" onClick={() => openEdit(listing)}>Düzenle</button><button className="danger" type="button" onClick={() => remove(listing)}>Sil</button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

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
              <label className="span-2"><span>Açıklama</span><textarea rows={5} value={form.description} onChange={(event) => updateField("description", event.target.value)} /></label>
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
