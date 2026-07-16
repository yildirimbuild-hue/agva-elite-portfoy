"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ListingAction = { type: "open_listing"; reference: string; title: string; href: string };
type Message = { role: "user" | "assistant"; content: string; actions?: ListingAction[] };
type ListingContext = { reference: string; title: string };

const suggestions = [
  "Nehir kenarında villa arıyorum",
  "10 milyon TL altındaki ilanlar",
  "Yatırım için hangi arsalar uygun?",
];

export function AIConcierge({ listing }: { listing?: ListingContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
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

  async function ask(content: string) {
    const question = content.trim();
    if (!question || loading || redirecting) return;
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
            <div className="ai-avatar">AI</div>
            <div><strong>Portföy danışmanı</strong><span>{listing ? `${listing.reference} · Bu ilana hâkim` : "DeepSeek · İKİSU portföyüne bağlı"}</span></div>
            <button type="button" onClick={() => handlePanel(false)} aria-label="Danışmanı kapat">×</button>
          </header>
          <div className="ai-messages" aria-live="polite">
            <div className="ai-message assistant">{greeting}</div>
            {messages.map((message, index) => (
              <div className={`ai-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
                {message.actions && message.actions.length > 0 && <div className="ai-listing-actions">{message.actions.map((action) => <a href={action.href} key={action.reference}><span>{action.reference}</span><strong>{action.title}</strong><em>İlanı aç →</em></a>)}</div>}
              </div>
            ))}
            {loading && <div className="ai-message assistant typing"><i /><i /><i /></div>}
            {redirecting && <div className="ai-redirecting"><span /> İlan sayfası hazırlanıyor…</div>}
            {error && <div className="ai-error">{error}</div>}
            <div ref={messagesEndRef} />
          </div>
          {messages.length === 0 && <div className="ai-suggestions">{contextualSuggestions.map((item) => <button type="button" key={item} onClick={() => void ask(item)}>{item}</button>)}</div>}
          <form onSubmit={submit}>
            <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={1200} placeholder="Nasıl bir mülk arıyorsunuz?" aria-label="Yapay zekâya sorunuz" disabled={redirecting} />
            <button type="submit" disabled={loading || redirecting || !input.trim()} aria-label="Soruyu gönder">↑</button>
          </form>
          <small>Yanıtlar bilgilendirme amaçlıdır; güncel bilgi danışmanla doğrulanır.</small>
        </section>
      )}
      <button className="ai-launcher" type="button" onClick={() => handlePanel(!open)} aria-expanded={open}>
        <span>✦</span><div><strong>AI Danışman</strong><small>{listing ? "Bu ilanı sorun" : "Portföye sorun"}</small></div>
      </button>
    </div>
  );
}
