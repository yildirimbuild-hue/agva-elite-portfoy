"use client";

import { useEffect, useMemo, useState } from "react";
import { AIConcierge } from "@/components/AIConcierge";
import type { CompanyProfile, Listing } from "@/lib/types";

const formatMoney = (amount: number, currency: Listing["currency"]) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

const formatPrice = (listing: Listing) => formatMoney(listing.price, listing.currency);

const discountPercent = (listing: Listing) => listing.oldPrice > listing.price
  ? Math.round(((listing.oldPrice - listing.price) / listing.oldPrice) * 100)
  : 0;

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export default function PortfolioApp({ listings, company }: { listings: Listing[]; company: CompanyProfile }) {
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState("Tümü");
  const [propertyType, setPropertyType] = useState("Tümü");
  const [location, setLocation] = useState("Tümü");
  const [sort, setSort] = useState("featured");
  const [visible, setVisible] = useState(12);
  const [menuOpen, setMenuOpen] = useState(false);

  const locations = useMemo(() => [...new Set(listings.map((item) => item.location))].sort(), [listings]);
  const propertyTypes = useMemo(() => [...new Set(listings.map((item) => item.propertyType))].sort(), [listings]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    const next = listings.filter((item) => {
      const matchesText = !normalized || `${item.title} ${item.location} ${item.reference}`.toLocaleLowerCase("tr-TR").includes(normalized);
      return matchesText && (purpose === "Tümü" || item.purpose === purpose) &&
        (propertyType === "Tümü" || item.propertyType === propertyType) &&
        (location === "Tümü" || item.location === location);
    });
    return [...next].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "newest") return b.updatedAt.localeCompare(a.updatedAt);
      return Number(b.featured) - Number(a.featured);
    });
  }, [listings, location, propertyType, purpose, query, sort]);

  useEffect(() => setVisible(12), [query, purpose, propertyType, location, sort]);

  const selectPurpose = (value: string) => {
    setPurpose(value);
    setMenuOpen(false);
    document.querySelector("#portfoy")?.scrollIntoView({ behavior: "smooth" });
  };

  const clearFilters = () => {
    setQuery("");
    setPurpose("Tümü");
    setPropertyType("Tümü");
    setLocation("Tümü");
  };

  const whatsappDigits = company.whatsappNumber.replace(/\D/g, "");
  const phoneNumber = company.phoneNumber.trim();
  const contactMissing = () => window.alert("Firma iletişim numarası henüz yönetim ayarlarına eklenmedi.");
  const whatsappHref = (listing?: Listing) => {
    const message = listing
      ? `Merhaba, ${listing.reference} numaralı “${listing.title}” ilanı hakkında bilgi almak istiyorum.`
      : "Merhaba, Ağva ve Şile portföyleriniz hakkında bilgi almak istiyorum.";
    return `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`;
  };

  return (
    <>
      <header className="catalog-header">
        <a className="brand catalog-brand" href="#top" aria-label="İKİSU ana sayfa">
          <span className="brand-mark">İK</span>
          <span className="brand-copy"><strong>İKİSU</strong><small>EMLAK · AĞVA</small></span>
        </a>
        <nav className={menuOpen ? "catalog-nav open" : "catalog-nav"}>
          <button type="button" onClick={() => selectPurpose("Satılık")}>Satılık</button>
          <button type="button" onClick={() => selectPurpose("Kiralık")}>Kiralık</button>
          <button type="button" onClick={() => { setPropertyType("Arsa"); selectPurpose("Tümü"); }}>Arsa</button>
          <a href="#portfoy" onClick={() => setMenuOpen(false)}>Tüm portföy</a>
          <a className="admin-nav-link" href="/admin">Admin paneli</a>
        </nav>
        {whatsappDigits ? <a className="header-contact" href={whatsappHref()} target="_blank" rel="noreferrer">WhatsApp</a> : <button className="header-contact" type="button" onClick={contactMissing}>WhatsApp</button>}
        <button className="menu-button catalog-menu" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Menüyü aç veya kapat">
          <span /><span />
        </button>
      </header>

      <main id="top">
        <section className="catalog-hero">
          <img src="/images/hero-agva.webp" alt="Ağva'da nehir kıyısında villa" />
          <div className="catalog-hero-shade" />
          <div className="catalog-hero-content">
            <span className="catalog-kicker">AĞVA · ŞİLE · İSTANBUL</span>
            <h1>Aradığınız yer,<br /><em>burada başlıyor.</em></h1>
            <p>Satılık ve kiralık villa, müstakil ev, daire, arsa ve ticari portföyler.</p>
          </div>

          <div className="hero-search" aria-label="Portföy arama">
            <label>
              <span>İşlem</span>
              <select value={purpose} onChange={(event) => setPurpose(event.target.value)}>
                <option>Tümü</option><option>Satılık</option><option>Kiralık</option>
              </select>
            </label>
            <label>
              <span>Emlak tipi</span>
              <select value={propertyType} onChange={(event) => setPropertyType(event.target.value)}>
                <option>Tümü</option>{propertyTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Bölge</span>
              <select value={location} onChange={(event) => setLocation(event.target.value)}>
                <option>Tümü</option>{locations.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="keyword-field">
              <span>Anahtar kelime</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Villa, Göksu, IKS-0001..." />
            </label>
            <button type="button" onClick={() => document.querySelector("#portfoy")?.scrollIntoView({ behavior: "smooth" })}>
              İlan ara <Arrow />
            </button>
          </div>
        </section>

        {listings.some((item) => item.isDemo) && (
          <div className="demo-notice page-pad">
            <span>DEMO VERİLER</span>
            <p>Portföy yapısını göstermek için örnek ilanlar kullanılıyor. Gerçek ilanlar admin panelinden girilebilir.</p>
            <a href="/admin">Admin paneline git <Arrow /></a>
          </div>
        )}

        <section className="portfolio-summary page-pad">
          <div><strong>{listings.length}</strong><span>yayındaki ilan</span></div>
          <div><strong>{listings.filter((item) => item.purpose === "Satılık").length}</strong><span>satılık portföy</span></div>
          <div><strong>{listings.filter((item) => item.purpose === "Kiralık").length}</strong><span>kiralık portföy</span></div>
          <div><strong>{locations.length}</strong><span>Ağva bölgesi</span></div>
        </section>

        <section className="portfolio-catalog page-pad" id="portfoy">
          <div className="catalog-title-row">
            <div>
              <span className="eyebrow dark"><span>GÜNCEL PORTFÖY</span></span>
              <h2>Tüm ilanlar</h2>
            </div>
            <p>{filtered.length} ilan bulundu</p>
          </div>

          <div className="catalog-toolbar">
            <div className="quick-tabs">
              {["Tümü", "Satılık", "Kiralık"].map((item) => (
                <button key={item} className={purpose === item ? "active" : ""} type="button" onClick={() => setPurpose(item)}>{item}</button>
              ))}
            </div>
            <select value={propertyType} onChange={(event) => setPropertyType(event.target.value)} aria-label="Emlak tipi">
              <option>Tümü</option>{propertyTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Bölge">
              <option>Tümü</option>{locations.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sıralama">
              <option value="featured">Öne çıkanlar</option>
              <option value="newest">En yeni</option>
              <option value="price-asc">Fiyat: artan</option>
              <option value="price-desc">Fiyat: azalan</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-results"><h3>Bu kriterlerde ilan bulunamadı.</h3><button type="button" onClick={clearFilters}>Filtreleri temizle</button></div>
          ) : (
            <div className="property-grid">
              {filtered.slice(0, visible).map((listing) => (
                <article className="property-card" key={listing.id}>
                  <a className="property-hit" href={`/ilan/${listing.slug}`} aria-label={`${listing.title} detayını aç`} />
                  <div className="property-image">
                    <img src={listing.images[0] || "/images/forest-house.webp"} alt={listing.title} />
                    <div className="property-badges">
                      {listing.urgent && <span className="badge-urgent">Çok acil</span>}
                      {discountPercent(listing) > 0 && <span className="badge-discount">%{discountPercent(listing)} fiyat düştü</span>}
                      <span className="badge-purpose">{listing.purpose}</span>
                      {listing.featured && <span className="badge-featured">Öne çıkan</span>}
                    </div>
                    <button className="favorite" type="button" aria-label="Favoriye ekle">♡</button>
                  </div>
                  <div className="property-content">
                    <div className="property-meta"><span>{listing.propertyType}</span><span>{listing.reference}</span></div>
                    <h3>{listing.title}</h3>
                    <p className="property-location">{listing.location} · {listing.district}</p>
                    <div className="property-specs">
                      {listing.rooms !== "—" && <span>{listing.rooms}</span>}
                      {listing.grossArea > 0 && <span>{listing.grossArea} m²</span>}
                      {listing.landArea > 0 && <span>{listing.landArea} m² arsa</span>}
                    </div>
                    <div className="property-price">
                      <div>{listing.oldPrice > listing.price && <del>{formatMoney(listing.oldPrice, listing.currency)}</del>}<strong>{formatPrice(listing)}</strong></div>
                      <span>Detaylar →</span>
                    </div>
                    <div className="property-contact-actions">
                      {whatsappDigits ? <a href={whatsappHref(listing)} target="_blank" rel="noreferrer">WhatsApp’tan yaz</a> : <button type="button" onClick={contactMissing}>WhatsApp’tan yaz</button>}
                      {phoneNumber ? <a href={`tel:${phoneNumber}`}>Hemen ara</a> : <button type="button" onClick={contactMissing}>Hemen ara</button>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {visible < filtered.length && <button className="load-more" type="button" onClick={() => setVisible((value) => value + 12)}>Daha fazla ilan göster</button>}
        </section>

        <section className="catalog-cta page-pad">
          <div><span>İLANINIZI DEĞERLENDİRELİM</span><h2>Ağva’daki mülkünüzü doğru alıcıyla buluşturalım.</h2></div>
          <a href="/admin">Portföy ekle <Arrow /></a>
        </section>
      </main>

      <footer className="catalog-footer page-pad">
        <div className="footer-logo">İKİSU</div>
        <p>Ağva ve Şile bölgesi satılık, kiralık ve yatırım portföyleri.</p>
        <div><a href="#portfoy">Tüm ilanlar</a><a href="/admin">Admin paneli</a><a href="#top">Yukarı dön ↑</a></div>
      </footer>

      <div className="contact-dock" aria-label="Hızlı iletişim">
        {whatsappDigits ? <a className="dock-whatsapp" href={whatsappHref()} target="_blank" rel="noreferrer"><span>WA</span><strong>Mesaj yaz</strong></a> : <button className="dock-whatsapp" type="button" onClick={contactMissing}><span>WA</span><strong>Mesaj yaz</strong></button>}
        {phoneNumber ? <a className="dock-call" href={`tel:${phoneNumber}`}><span>☎</span><strong>Ara</strong></a> : <button className="dock-call" type="button" onClick={contactMissing}><span>☎</span><strong>Ara</strong></button>}
      </div>
      <AIConcierge />
    </>
  );
}
