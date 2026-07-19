"use client";

import { useEffect, useState } from "react";
import type { Listing, ListingMatchResponse } from "@/lib/types";

type Props = { listing: Listing; onClose: () => void; onOpenCustomer: (leadId: string) => void };

function statusLabel(status: string) {
  if (status === "eligible") return "Uygun";
  if (status === "insufficient_data") return "Bilgi gerekli";
  return "Uygun değil";
}

export function ListingMatchesModal({ listing, onClose, onOpenCustomer }: Props) {
  const [data, setData] = useState<ListingMatchResponse | null>(null);
  const [message, setMessage] = useState("Eşleşmeler hesaplanıyor...");

  useEffect(() => {
    let active = true;
    void fetch(`/api/admin/matches?listingReference=${encodeURIComponent(listing.reference)}`, { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (!active) return;
        if (!response.ok) setMessage(payload.error ?? "Eşleşmeler yüklenemedi.");
        else { setData(payload); setMessage(""); }
      })
      .catch(() => { if (active) setMessage("Eşleşmeler yüklenemedi."); });
    return () => { active = false; };
  }, [listing.reference]);

  return <div className="customer-card-modal" role="dialog" aria-modal="true" aria-label="Portföy müşteri eşleşmeleri">
    <button className="customer-card-backdrop" type="button" onClick={onClose} aria-label="Kapat" />
    <section className="customer-card-panel listing-match-panel">
      <header className="customer-card-header"><div><span>PORTFÖY EŞLEŞMELERİ</span><h2>{listing.title}</h2><small>{listing.reference} · {listing.location}</small></div><button type="button" onClick={onClose}>×</button></header>
      <div className="customer-card-content">
        {message && <div className="customer-card-message">{message}</div>}
        {data && <section className="match-list"><h3>Uygun müşteriler</h3>{data.matches.length === 0 ? <p>Aktif müşteri bulunmuyor.</p> : data.matches.map((item) => <article key={item.lead.id} data-status={item.status}>
          <header><div><strong>{item.lead.name || "İsimsiz müşteri"}</strong><small>{item.lead.customerRole} · {item.lead.stage} · {item.lead.temperature}</small></div><span>{statusLabel(item.status)}</span></header>
          <div className="match-score"><strong>{item.score === null ? "—" : `%${item.score}`}</strong><small>Veri kapsamı %{item.coveragePercent}</small></div>
          {item.reasons.length > 0 && <p>{item.reasons.slice(0, 4).join(" · ")}</p>}
          {item.warnings.length > 0 && <em>{item.warnings.join(" ")}</em>}
          <footer><a href={`tel:${item.lead.phone}`}>Ara</a><button type="button" onClick={() => { onOpenCustomer(item.lead.id); onClose(); }}>Müşteri kartını aç</button></footer>
        </article>)}</section>}
      </div>
      <footer className="customer-card-footer"><button type="button" onClick={onClose}>Kapat</button></footer>
    </section>
  </div>;
}
