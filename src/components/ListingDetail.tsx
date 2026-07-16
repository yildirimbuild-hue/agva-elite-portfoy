"use client";

import { AIConcierge } from "@/components/AIConcierge";
import type { CompanyProfile, Listing } from "@/lib/types";

const formatMoney = (amount: number, currency: Listing["currency"]) => new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency,
  maximumFractionDigits: 0,
}).format(amount);

export function ListingDetail({ listing, company }: { listing: Listing; company: CompanyProfile }) {
  const whatsappDigits = company.whatsappNumber.replace(/\D/g, "");
  const phoneNumber = company.phoneNumber.trim();
  const contactMissing = () => window.alert("Firma iletişim numarası henüz yönetim ayarlarına eklenmedi.");
  const whatsappMessage = `Merhaba, ${listing.reference} numaralı “${listing.title}” ilanı hakkında bilgi almak istiyorum.`;
  const whatsappHref = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(whatsappMessage)}`;
  const discount = listing.oldPrice > listing.price
    ? Math.round(((listing.oldPrice - listing.price) / listing.oldPrice) * 100)
    : 0;

  return (
    <>
      <header className="listing-detail-header">
        <a className="brand catalog-brand" href="/" aria-label="İKİSU ana sayfa">
          <span className="brand-mark">İK</span>
          <span className="brand-copy"><strong>İKİSU</strong><small>EMLAK · AĞVA</small></span>
        </a>
        <a className="listing-back" href="/">← Tüm portföye dön</a>
      </header>

      <main className="listing-detail-page">
        <section className="listing-detail-hero">
          <div className="listing-detail-visual">
            <img src={listing.images[0] || "/images/forest-house.webp"} alt={listing.title} />
            <div className="property-badges">
              {listing.urgent && <span className="badge-urgent">Çok acil</span>}
              {discount > 0 && <span className="badge-discount">%{discount} fiyat düştü</span>}
              <span className="badge-purpose">{listing.purpose}</span>
              {listing.featured && <span className="badge-featured">Öne çıkan</span>}
            </div>
          </div>

          <div className="listing-detail-intro">
            <div className="property-meta"><span>{listing.propertyType} · {listing.location}</span><span>{listing.reference}</span></div>
            <h1>{listing.title}</h1>
            <p className="property-location">{listing.location} · {listing.district}</p>
            <div className="detail-price">
              {listing.oldPrice > listing.price && <del>{formatMoney(listing.oldPrice, listing.currency)}</del>}
              <strong>{formatMoney(listing.price, listing.currency)}</strong>
              {discount > 0 && <span>%{discount} fiyat avantajı</span>}
            </div>
            <div className="detail-contact-actions">
              {whatsappDigits ? <a className="whatsapp-action" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp’tan bilgi al</a> : <button className="whatsapp-action" type="button" onClick={contactMissing}>WhatsApp’tan bilgi al</button>}
              {phoneNumber ? <a className="call-action" href={`tel:${phoneNumber}`}>Danışmanı ara</a> : <button className="call-action" type="button" onClick={contactMissing}>Danışmanı ara</button>}
            </div>
            {listing.isDemo && <div className="modal-demo-warning">Bu kayıt sistem gösterimi için oluşturulmuş örnek ilandır.</div>}
          </div>
        </section>

        <section className="listing-detail-body page-pad">
          <div className="detail-main-copy">
            <span className="eyebrow dark"><span>PORTFÖY DETAYI</span></span>
            <h2>Mülk hakkında</h2>
            <p>{listing.description}</p>
            <div className="detail-features">{listing.features.map((feature) => <span key={feature}>✓ {feature}</span>)}</div>
          </div>
          <aside className="detail-specs">
            <div><span>Oda</span><strong>{listing.rooms}</strong></div>
            <div><span>Banyo</span><strong>{listing.bathrooms || "—"}</strong></div>
            <div><span>Brüt alan</span><strong>{listing.grossArea || "—"} m²</strong></div>
            <div><span>Net alan</span><strong>{listing.netArea || "—"} m²</strong></div>
            <div><span>Arsa</span><strong>{listing.landArea || "—"} m²</strong></div>
            <div><span>Kat</span><strong>{listing.floor || "—"}</strong></div>
          </aside>
        </section>

        <section className="listing-detail-cta page-pad">
          <div><span>{listing.reference}</span><h2>Bu portföyü yerinde değerlendirelim.</h2></div>
          <a href="/">Diğer ilanları incele →</a>
        </section>
      </main>

      <footer className="catalog-footer page-pad detail-footer">
        <div className="footer-logo">İKİSU</div>
        <p>{company.description}</p>
        <div><a href="/">Tüm ilanlar</a><a href="/admin">Admin paneli</a></div>
      </footer>
      <AIConcierge />
    </>
  );
}
