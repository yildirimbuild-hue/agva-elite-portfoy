"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Appointment, AppointmentDay, AppointmentHold, AppointmentSource, AppointmentSettings, Listing } from "@/lib/types";

type AppointmentListing = Pick<Listing, "reference" | "title" | "location">;

type Props = {
  listing: AppointmentListing;
  open: boolean;
  source: AppointmentSource;
  onClose: () => void;
  onBooked?: (appointment: Appointment) => void;
};

function formatAppointment(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function AppointmentScheduler({ listing, open, source, onClose, onBooked }: Props) {
  const [days, setDays] = useState<AppointmentDay[]>([]);
  const [settings, setSettings] = useState<AppointmentSettings | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [hold, setHold] = useState<AppointmentHold | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"calendar" | "details" | "done">("calendar");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [booked, setBooked] = useState<Appointment | null>(null);

  const visibleDay = useMemo(() => days.find((day) => day.date === selectedDate) ?? days[0] ?? null, [days, selectedDate]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setMessage("");
    setStep("calendar");
    setHold(null);
    setBooked(null);
    fetch("/api/appointments/availability", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Takvim yüklenemedi.");
        setDays(payload.days ?? []);
        setSettings(payload.settings ?? null);
        setSelectedDate(payload.days?.[0]?.date ?? "");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Takvim yüklenemedi."))
      .finally(() => setLoading(false));
  }, [open]);

  async function chooseSlot(startAt: string) {
    setLoading(true);
    setMessage("Seçtiğiniz saat 5 dakika boyunca sizin için tutuluyor...");
    try {
      const response = await fetch("/api/appointments/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingReference: listing.reference, startAt }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Saat seçilemedi.");
      setHold(payload);
      setStep("details");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Saat seçilemedi.");
      const response = await fetch("/api/appointments/availability", { cache: "no-store" }).catch(() => null);
      if (response?.ok) {
        const payload = await response.json();
        setDays(payload.days ?? []);
        setSelectedDate(payload.days?.[0]?.date ?? "");
      }
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!hold) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdToken: hold.token,
          listingReference: listing.reference,
          customerName: name,
          phone,
          note,
          source,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Randevu kaydedilemedi.");
      setBooked(payload.appointment);
      setStep("done");
      onBooked?.(payload.appointment);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Randevu kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="appointment-modal" role="dialog" aria-modal="true" aria-label="Randevu takvimi">
      <button className="appointment-backdrop" type="button" onClick={onClose} aria-label="Randevu penceresini kapat" />
      <section className="appointment-panel">
        <header>
          <div><span>YERİNDE İNCELEME</span><h2>Randevu planlayın</h2></div>
          <button type="button" onClick={onClose} aria-label="Kapat">×</button>
        </header>
        <div className="appointment-listing-context">
          <span>{listing.reference}</span>
          <div><strong>{listing.title}</strong><small>{listing.location}</small></div>
        </div>

        {step === "calendar" && <div className="appointment-calendar-step">
          <div className="appointment-step-copy"><strong>1. Uygun günü ve saati seçin</strong><small>Saatler Türkiye saatine göredir. Dolu saatler otomatik olarak gösterilmez.</small></div>
          {loading && !days.length ? <div className="appointment-loading">Takvim hazırlanıyor…</div> : days.length === 0 ? <div className="appointment-empty">Şu anda uygun saat bulunmuyor. Lütfen danışmanla telefon üzerinden iletişime geçin.</div> : <>
            <div className="appointment-days" aria-label="Uygun günler">
              {days.slice(0, 14).map((day) => <button className={(visibleDay?.date === day.date) ? "active" : ""} type="button" key={day.date} onClick={() => setSelectedDate(day.date)}><strong>{day.label}</strong><small>{day.slots.length} boş saat</small></button>)}
            </div>
            <div className="appointment-slots" aria-label="Uygun saatler">
              {visibleDay?.slots.map((slot) => <button type="button" disabled={loading} key={slot.startAt} onClick={() => void chooseSlot(slot.startAt)}>{slot.label}</button>)}
            </div>
          </>}
        </div>}

        {step === "details" && hold && <form className="appointment-details-step" onSubmit={submit}>
          <div className="appointment-step-copy"><strong>2. İletişim bilgilerinizi yazın</strong><small>Seçilen saat 5 dakika tutulur. Danışman randevu talebinizi kontrol edip sizinle iletişime geçer.</small></div>
          <div className="appointment-selected-time"><span>Seçilen zaman</span><strong>{formatAppointment(hold.startAt)}</strong><button type="button" onClick={() => { setStep("calendar"); setHold(null); }}>Değiştir</button></div>
          <div className="appointment-form-grid">
            <label><span>Ad soyad *</span><input value={name} maxLength={80} required autoComplete="name" onChange={(event) => setName(event.target.value)} /></label>
            <label><span>Telefon *</span><input value={phone} maxLength={24} minLength={10} required inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" onChange={(event) => setPhone(event.target.value)} /></label>
            <label className="span-2"><span>Ek not</span><textarea value={note} maxLength={500} rows={3} placeholder="Örneğin: Konumu WhatsApp üzerinden paylaşabilir misiniz?" onChange={(event) => setNote(event.target.value)} /></label>
          </div>
          <button className="appointment-confirm" type="submit" disabled={loading}>{loading ? "Kaydediliyor…" : settings?.mode === "instant" ? "Randevuyu kesinleştir" : "Randevu talebini gönder"}</button>
        </form>}

        {step === "done" && booked && <div className="appointment-done">
          <span>✓</span>
          <h3>{booked.status === "Onaylandı" ? "Randevunuz onaylandı" : "Randevu talebiniz alındı"}</h3>
          <p><strong>{formatAppointment(booked.startAt)}</strong><br />{listing.reference} · {listing.title}</p>
          <small>{booked.status === "Talep Alındı" ? "Danışman programı doğruladıktan sonra sizinle iletişime geçecektir." : "Belirlenen saatte görüşmek üzere."}</small>
          <button type="button" onClick={onClose}>Tamam</button>
        </div>}

        {message && <div className="appointment-message">{message}</div>}
        <footer><span>Takvim saat dilimi</span><strong>Europe/Istanbul</strong></footer>
      </section>
    </div>
  );
}
