"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Listing, ListingInput, ListingPurpose, PropertyType } from "@/lib/types";

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

export function AdminPanel({ initialListings }: { initialListings: Listing[] }) {
  const router = useRouter();
  const [listings, setListings] = useState(initialListings);
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
    setMessage(`${uploaded.length} görsel yüklendi.`);
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

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/"><span>İK</span><div><strong>İKİSU</strong><small>EMLAK YÖNETİMİ</small></div></a>
        <nav><button className="active" type="button">▦ Portföy</button><a href="/" target="_blank">↗ Siteyi görüntüle</a></nav>
        <div className="admin-sidebar-foot"><button type="button" onClick={logout}>Oturumu kapat</button></div>
      </aside>

      <section className="admin-main">
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
                <td><div className="admin-listing-cell"><img src={listing.images[0] || "/images/forest-house.webp"} alt="" /><div><strong>{listing.title}</strong><span>{listing.reference} · {listing.location}</span></div></div></td>
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

      {editorOpen && (
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
              <label className="span-2 upload-field"><span>Bilgisayardan görsel yükle</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadImages} /><small>JPG, PNG veya WebP · Görsel başına en fazla 8 MB</small></label>
              {form.images.length > 0 && <div className="admin-image-previews span-2">{form.images.map((image) => <div key={image}><img src={image} alt="Yüklenen ilan" /><button type="button" onClick={() => updateField("images", form.images.filter((item) => item !== image))}>×</button></div>)}</div>}
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
