"use client";

import { FormEvent, useState } from "react";

type ListingAction = { type: "open_listing"; reference: string; title: string; href: string };
type Message = { role: "user" | "assistant"; content: string; actions?: ListingAction[] };

const suggestions = [
  "Nehir kenarında villa arıyorum",
  "10 milyon TL altındaki ilanlar",
  "Yatırım için hangi arsalar uygun?",
];

export function AIConcierge() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(content: string) {
    const question = content.trim();
    if (!question || loading) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
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
        window.location.assign(payload.actions[0].href);
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
            <div><strong>Portföy danışmanı</strong><span>DeepSeek · İKİSU portföyüne bağlı</span></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Danışmanı kapat">×</button>
          </header>
          <div className="ai-messages" aria-live="polite">
            <div className="ai-message assistant">Merhaba. Bütçenizi, aradığınız bölgeyi veya emlak tipini yazın; güncel portföyden uygun seçenekleri bulayım.</div>
            {messages.map((message, index) => (
              <div className={`ai-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
                {message.actions && message.actions.length > 0 && <div className="ai-listing-actions">{message.actions.map((action) => <a href={action.href} key={action.reference}><span>{action.reference}</span><strong>{action.title}</strong><em>İlanı aç →</em></a>)}</div>}
              </div>
            ))}
            {loading && <div className="ai-message assistant typing"><i /><i /><i /></div>}
            {error && <div className="ai-error">{error}</div>}
          </div>
          {messages.length === 0 && <div className="ai-suggestions">{suggestions.map((item) => <button type="button" key={item} onClick={() => void ask(item)}>{item}</button>)}</div>}
          <form onSubmit={submit}>
            <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={1200} placeholder="Nasıl bir mülk arıyorsunuz?" aria-label="Yapay zekâya sorunuz" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Soruyu gönder">↑</button>
          </form>
          <small>Yanıtlar bilgilendirme amaçlıdır; güncel bilgi danışmanla doğrulanır.</small>
        </section>
      )}
      <button className="ai-launcher" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>✦</span><div><strong>AI Danışman</strong><small>Portföye sorun</small></div>
      </button>
    </div>
  );
}
