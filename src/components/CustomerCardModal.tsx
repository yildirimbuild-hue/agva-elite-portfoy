"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CUSTOMER_ROLES, FINANCING_TYPES, LEAD_TEMPERATURES, PURCHASE_TIMELINES, customerProfileCompleteness } from "@/lib/customer-card";
import { LEAD_STAGES } from "@/lib/lead-pipeline";
import type { Appointment, CustomerInteraction, CustomerMatchResponse, InteractionType, Lead, LeadStage, Listing } from "@/lib/types";

const INTERACTION_TYPES: InteractionType[] = ["Arama", "WhatsApp", "Not", "Randevu", "E-posta"];
const PROPERTY_TYPES = ["Villa", "Müstakil Ev", "Daire", "Arsa", "Ticari"];

type Tab = "summary" | "needs" | "matches" | "interactions" | "appointments" | "listings" | "history";

type Props = {
  lead: Lead;
  listings: Listing[];
  appointments: Appointment[];
  onClose: () => void;
  onUpdated: (lead: Lead) => void;
};

function toLocalInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function listText(value: string[]) { return value.join(", "); }
function parseList(value: string) { return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))]; }

export function CustomerCardModal({ lead, listings, appointments, onClose, onUpdated }: Props) {
  const [draft, setDraft] = useState<Lead>({ ...lead });
  const [tab, setTab] = useState<Tab>("summary");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [interactions, setInteractions] = useState<CustomerInteraction[]>([]);
  const [interactionType, setInteractionType] = useState<InteractionType>("Arama");
  const [interactionSummary, setInteractionSummary] = useState("");
  const [interactionOutcome, setInteractionOutcome] = useState("");
  const [interactionNextAction, setInteractionNextAction] = useState("");
  const [listingToAdd, setListingToAdd] = useState("");
  const [matchData, setMatchData] = useState<CustomerMatchResponse | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);

  useEffect(() => { setDraft({ ...lead }); setMatchData(null); }, [lead]);
  useEffect(() => {
    let active = true;
    void fetch(`/api/admin/interactions?leadId=${encodeURIComponent(lead.id)}`, { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => { if (active) response.ok ? setInteractions(payload) : setMessage(payload.error ?? "İletişim geçmişi yüklenemedi."); })
      .catch(() => { if (active) setMessage("İletişim geçmişi yüklenemedi."); });
    return () => { active = false; };
  }, [lead.id]);


  useEffect(() => {
    if (tab !== "matches" || matchData || matchesLoading) return;
    let active = true;
    setMatchesLoading(true);
    void fetch(`/api/admin/matches?leadId=${encodeURIComponent(lead.id)}`, { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (!active) return;
        if (!response.ok) setMessage(payload.error ?? "Eşleşmeler yüklenemedi.");
        else setMatchData(payload);
      })
      .catch(() => { if (active) setMessage("Eşleşmeler yüklenemedi."); })
      .finally(() => { if (active) setMatchesLoading(false); });
    return () => { active = false; };
  }, [lead.id, matchData, matchesLoading, tab]);

  const completeness = customerProfileCompleteness(draft);
  const customerAppointments = useMemo(() => appointments.filter((item) => item.leadId === lead.id).sort((a, b) => b.startAt.localeCompare(a.startAt)), [appointments, lead.id]);
  const linkedListings = useMemo(() => draft.listingReferences.map((reference) => listings.find((item) => item.reference === reference)).filter((item): item is Listing => Boolean(item)), [draft.listingReferences, listings]);
  const availableListings = useMemo(() => listings.filter((item) => !draft.listingReferences.includes(item.reference)), [draft.listingReferences, listings]);

  function update<K extends keyof Lead>(key: K, value: Lead[K]) { setDraft((current) => ({ ...current, [key]: value })); }

  async function saveProfile(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const profile = {
        name: draft.name, phone: draft.phone, email: draft.email, customerRole: draft.customerRole,
        budget: draft.budget, minBudget: draft.minBudget, maxBudget: draft.maxBudget, budgetCurrency: draft.budgetCurrency,
        region: draft.region, preferredRegions: draft.preferredRegions, propertyType: draft.propertyType,
        preferredPropertyTypes: draft.preferredPropertyTypes, minRooms: draft.minRooms, minArea: draft.minArea,
        financing: draft.financing, purchaseTimeline: draft.purchaseTimeline, mustHave: draft.mustHave,
        niceToHave: draft.niceToHave, avoidFeatures: draft.avoidFeatures, appointmentTime: draft.appointmentTime,
        summary: draft.summary, listingReferences: draft.listingReferences, assignedAdvisor: draft.assignedAdvisor,
        temperature: draft.temperature, lastContactAt: draft.lastContactAt, nextActionAt: draft.nextActionAt,
      };
      const response = await fetch("/api/admin/leads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, profile }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Müşteri kartı kaydedilemedi.");
      setDraft(payload);
      onUpdated(payload);
      setMessage("Müşteri kartı kaydedildi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Müşteri kartı kaydedilemedi."); }
    finally { setBusy(false); }
  }

  async function changeStage(stage: LeadStage) {
    if (stage === draft.stage) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/leads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, stage }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "CRM aşaması güncellenemedi.");
      setDraft(payload);
      onUpdated(payload);
      setMessage(`CRM aşaması ${stage} olarak güncellendi.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "CRM aşaması güncellenemedi."); }
    finally { setBusy(false); }
  }

  async function addInteraction(event: FormEvent) {
    event.preventDefault();
    if (!interactionSummary.trim()) { setMessage("Görüşme özeti zorunludur."); return; }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/interactions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, type: interactionType, summary: interactionSummary, outcome: interactionOutcome, nextActionAt: fromLocalInput(interactionNextAction), createdBy: draft.assignedAdvisor || "Admin" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Görüşme kaydedilemedi.");
      setInteractions((current) => [payload.interaction, ...current]);
      setDraft(payload.lead);
      onUpdated(payload.lead);
      setInteractionSummary(""); setInteractionOutcome(""); setInteractionNextAction("");
      setMessage("İletişim kaydı eklendi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Görüşme kaydedilemedi."); }
    finally { setBusy(false); }
  }

  async function removeInteraction(item: CustomerInteraction) {
    if (!window.confirm("Bu iletişim kaydı silinsin mi?")) return;
    const response = await fetch("/api/admin/interactions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
    if (response.ok) setInteractions((current) => current.filter((entry) => entry.id !== item.id));
  }

  function addListingReference() {
    if (!listingToAdd) return;
    update("listingReferences", [...new Set([...draft.listingReferences, listingToAdd])]);
    setListingToAdd("");
  }

  async function linkMatchedListing(reference: string) {
    const references = [...new Set([...draft.listingReferences, reference])];
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/leads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, profile: { listingReferences: references } }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Portföy müşteri kartına eklenemedi.");
      setDraft(payload);
      onUpdated(payload);
      setMessage("Portföy ilgilenilen ilanlara eklendi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Portföy eklenemedi."); }
    finally { setBusy(false); }
  }


  return <div className="customer-card-modal" role="dialog" aria-modal="true" aria-label="Müşteri kartı">
    <button className="customer-card-backdrop" type="button" onClick={onClose} aria-label="Müşteri kartını kapat" />
    <section className="customer-card-panel">
      <header className="customer-card-header">
        <div><span>MÜŞTERİ 360</span><h2>{draft.name || "İsimsiz müşteri"}</h2><small>{draft.phone} · {draft.stage} · {draft.temperature}</small></div>
        <div className="customer-card-score"><span>Profil</span><strong>%{completeness}</strong></div>
        <button type="button" onClick={onClose}>×</button>
      </header>
      <nav className="customer-card-tabs">
        {([[
          "summary", "Özet"], ["needs", "İhtiyaçlar"], ["interactions", `İletişim (${interactions.length})`],
          ["appointments", `Randevular (${customerAppointments.length})`], ["listings", `İlanlar (${draft.listingReferences.length})`], ["history", "CRM geçmişi"],
        ] as [Tab, string][]).map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} type="button" onClick={() => setTab(key)}>{label}</button>)}
      </nav>
      {message && <div className="customer-card-message">{message}<button type="button" onClick={() => setMessage("")}>×</button></div>}

      <div className="customer-card-content">
        {tab === "summary" && <form className="customer-card-form" onSubmit={saveProfile}>
          <label><span>Ad soyad</span><input value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label><span>Telefon</span><input value={draft.phone} onChange={(event) => update("phone", event.target.value)} /></label>
          <label><span>E-posta</span><input type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} /></label>
          <label><span>Müşteri tipi</span><select value={draft.customerRole} onChange={(event) => update("customerRole", event.target.value as Lead["customerRole"])}>{CUSTOMER_ROLES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Müşteri sıcaklığı</span><select value={draft.temperature} onChange={(event) => update("temperature", event.target.value as Lead["temperature"])}>{LEAD_TEMPERATURES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Atanan danışman</span><input value={draft.assignedAdvisor} onChange={(event) => update("assignedAdvisor", event.target.value)} placeholder="Danışman adı" /></label>
          <label><span>CRM aşaması</span><select value={draft.stage} disabled={busy} onChange={(event) => void changeStage(event.target.value as LeadStage)}>{LEAD_STAGES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Son iletişim</span><input type="datetime-local" value={toLocalInput(draft.lastContactAt)} onChange={(event) => update("lastContactAt", fromLocalInput(event.target.value))} /></label>
          <label><span>Sonraki yapılacak işlem</span><input type="datetime-local" value={toLocalInput(draft.nextActionAt)} onChange={(event) => update("nextActionAt", fromLocalInput(event.target.value))} /></label>
          <label className="span-2"><span>Müşteri özeti ve önemli notlar</span><textarea rows={6} value={draft.summary} onChange={(event) => update("summary", event.target.value)} /></label>
          <footer className="span-2"><span>Kayıt: {new Date(draft.createdAt).toLocaleString("tr-TR")}</span><button className="admin-primary" type="submit" disabled={busy}>{busy ? "Kaydediliyor..." : "Müşteri kartını kaydet"}</button></footer>
        </form>}

        {tab === "needs" && <form className="customer-card-form" onSubmit={saveProfile}>
          <label><span>Minimum bütçe</span><input type="number" min="0" value={draft.minBudget || ""} onChange={(event) => update("minBudget", Number(event.target.value))} /></label>
          <label><span>Maksimum bütçe</span><input type="number" min="0" value={draft.maxBudget || ""} onChange={(event) => update("maxBudget", Number(event.target.value))} /></label>
          <label><span>Para birimi</span><select value={draft.budgetCurrency} onChange={(event) => update("budgetCurrency", event.target.value as Lead["budgetCurrency"])}><option>TRY</option><option>USD</option><option>EUR</option></select></label>
          <label><span>Eski bütçe notu</span><input value={draft.budget} onChange={(event) => update("budget", event.target.value)} placeholder="Örn. 10-15 milyon TL" /></label>
          <label className="span-2"><span>Tercih edilen bölgeler — virgülle ayırın</span><input value={listText(draft.preferredRegions)} onChange={(event) => update("preferredRegions", parseList(event.target.value))} placeholder="Ağva, Şile, Göksu" /></label>
          <div className="customer-card-field span-2"><span>Gayrimenkul türleri</span><div className="customer-card-checks">{PROPERTY_TYPES.map((item) => <label key={item}><input type="checkbox" checked={draft.preferredPropertyTypes.includes(item)} onChange={(event) => update("preferredPropertyTypes", event.target.checked ? [...draft.preferredPropertyTypes, item] : draft.preferredPropertyTypes.filter((value) => value !== item))} /><span>{item}</span></label>)}</div></div>
          <label><span>Minimum oda</span><input value={draft.minRooms} onChange={(event) => update("minRooms", event.target.value)} placeholder="3+1" /></label>
          <label><span>Minimum alan (m²)</span><input type="number" min="0" value={draft.minArea || ""} onChange={(event) => update("minArea", Number(event.target.value))} /></label>
          <label><span>Finansman</span><select value={draft.financing} onChange={(event) => update("financing", event.target.value as Lead["financing"])}>{FINANCING_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Satın alma zamanı</span><select value={draft.purchaseTimeline} onChange={(event) => update("purchaseTimeline", event.target.value as Lead["purchaseTimeline"])}>{PURCHASE_TIMELINES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="span-2"><span>Vazgeçilmez özellikler</span><input value={listText(draft.mustHave)} onChange={(event) => update("mustHave", parseList(event.target.value))} placeholder="Bahçe, krediye uygun, müstakil" /></label>
          <label className="span-2"><span>Tercih edilen özellikler</span><input value={listText(draft.niceToHave)} onChange={(event) => update("niceToHave", parseList(event.target.value))} placeholder="Şömine, nehir manzarası" /></label>
          <label className="span-2"><span>Kesinlikle istemediği özellikler</span><input value={listText(draft.avoidFeatures)} onChange={(event) => update("avoidFeatures", parseList(event.target.value))} placeholder="Hisseli tapu, ana yola uzak" /></label>
          <footer className="span-2"><span>Bu alanlar Paket 3 eşleştirme motorunun girdisidir.</span><button className="admin-primary" type="submit" disabled={busy}>{busy ? "Kaydediliyor..." : "İhtiyaçları kaydet"}</button></footer>
        </form>}


        {tab === "matches" && <section className="match-list"><h3>Otomatik portföy eşleşmeleri</h3>{matchesLoading ? <p>Eşleşmeler hesaplanıyor...</p> : !matchData ? <p>Eşleşme verisi yüklenemedi.</p> : matchData.matches.length === 0 ? <p>Yayındaki portföy bulunmuyor.</p> : matchData.matches.map((item) => <article key={item.listing.reference} data-status={item.status}>
          <header><div><strong>{item.listing.title}</strong><small>{item.listing.reference} · {item.listing.location} · {item.listing.purpose}</small></div><span>{item.status === "eligible" ? "Uygun" : item.status === "insufficient_data" ? "Bilgi gerekli" : "Uygun değil"}</span></header>
          <div className="match-score"><strong>{item.score === null ? "—" : `%${item.score}`}</strong><small>Veri kapsamı %{item.coveragePercent}</small></div>
          {item.reasons.length > 0 && <p>{item.reasons.slice(0, 4).join(" · ")}</p>}
          {item.warnings.length > 0 && <em>{item.warnings.join(" ")}</em>}
          <footer><a href={`/ilan/${item.listing.slug}`} target="_blank" rel="noreferrer">İlanı aç</a><button type="button" disabled={busy || draft.listingReferences.includes(item.listing.reference)} onClick={() => void linkMatchedListing(item.listing.reference)}>{draft.listingReferences.includes(item.listing.reference) ? "Ekli" : "İlgilenilenlere ekle"}</button></footer>
        </article>)}</section>}

        {tab === "interactions" && <div className="customer-interactions-layout">
          <form className="customer-interaction-form" onSubmit={addInteraction}>
            <h3>Yeni iletişim kaydı</h3>
            <label><span>Kanal</span><select value={interactionType} onChange={(event) => setInteractionType(event.target.value as InteractionType)}>{INTERACTION_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Görüşme özeti *</span><textarea rows={5} value={interactionSummary} onChange={(event) => setInteractionSummary(event.target.value)} placeholder="Ne konuşuldu? Müşteri ne istedi?" required /></label>
            <label><span>Sonuç</span><textarea rows={3} value={interactionOutcome} onChange={(event) => setInteractionOutcome(event.target.value)} placeholder="Randevu istedi, teklif bekliyor..." /></label>
            <label><span>Sonraki işlem zamanı</span><input type="datetime-local" value={interactionNextAction} onChange={(event) => setInteractionNextAction(event.target.value)} /></label>
            <button className="admin-primary" type="submit" disabled={busy}>{busy ? "Kaydediliyor..." : "İletişimi kaydet"}</button>
          </form>
          <section className="customer-interaction-list"><h3>İletişim zaman çizelgesi</h3>{interactions.length === 0 ? <p>Henüz iletişim kaydı bulunmuyor.</p> : interactions.map((item) => <article key={item.id}><header><strong>{item.type}</strong><span>{new Date(item.createdAt).toLocaleString("tr-TR")}</span></header><p>{item.summary}</p>{item.outcome && <small>Sonuç: {item.outcome}</small>}{item.nextActionAt && <em>Sonraki işlem: {new Date(item.nextActionAt).toLocaleString("tr-TR")}</em>}<footer><span>{item.createdBy}</span><button type="button" onClick={() => void removeInteraction(item)}>Sil</button></footer></article>)}</section>
        </div>}

        {tab === "appointments" && <section className="customer-card-list"><h3>Randevu geçmişi</h3>{customerAppointments.length === 0 ? <p>Bu müşteriye bağlı randevu bulunmuyor.</p> : customerAppointments.map((item) => <article key={item.id}><div><strong>{new Date(item.startAt).toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" })}</strong><span>{item.status}</span></div><h4>{item.listingTitle}</h4><small>{item.listingReference} · {item.source}</small>{item.note && <p>{item.note}</p>}</article>)}</section>}

        {tab === "listings" && <section className="customer-card-list"><h3>İlgilendiği ilanlar</h3><div className="customer-listing-add"><select value={listingToAdd} onChange={(event) => setListingToAdd(event.target.value)}><option value="">Portföy seçin</option>{availableListings.map((item) => <option key={item.id} value={item.reference}>{item.reference} · {item.title}</option>)}</select><button type="button" onClick={addListingReference}>Ekle</button><button className="admin-primary" type="button" disabled={busy} onClick={() => void saveProfile()}>Değişiklikleri kaydet</button></div>{linkedListings.length === 0 ? <p>Henüz ilan ilişkilendirilmedi.</p> : linkedListings.map((item) => <article key={item.id}><div><strong>{item.reference}</strong><span>{item.purpose}</span></div><h4>{item.title}</h4><small>{item.location} · {new Intl.NumberFormat("tr-TR").format(item.price)} {item.currency}</small><footer><a href={`/ilan/${item.slug}`} target="_blank" rel="noreferrer">İlanı aç</a><button type="button" onClick={() => update("listingReferences", draft.listingReferences.filter((reference) => reference !== item.reference))}>Kaldır</button></footer></article>)}</section>}

        {tab === "history" && <section className="customer-history"><h3>CRM aşama geçmişi</h3>{draft.stageHistory.map((item, index) => <article key={`${item.stage}-${item.changedAt}`}><span>{index + 1}</span><div><strong>{item.stage}</strong><small>{new Date(item.changedAt).toLocaleString("tr-TR")}</small></div></article>)}</section>}
      </div>
      <footer className="customer-card-footer"><a href={`tel:${draft.phone}`}>Ara</a><a href={`https://wa.me/${draft.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a><button type="button" onClick={onClose}>Kapat</button></footer>
    </section>
  </div>;
}
