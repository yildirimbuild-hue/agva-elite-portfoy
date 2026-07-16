"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "yildirim-build-demo-welcome-v1";

export function DemoWelcome({ listingCount }: { listingCount: number }) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (!window.sessionStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }

    const reopen = () => {
      setClosing(false);
      setVisible(true);
    };
    window.addEventListener("ikisu:open-demo", reopen);
    return () => {
      window.removeEventListener("ikisu:open-demo", reopen);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    document.body.classList.add("demo-welcome-open");
    const focusTimer = window.setTimeout(() => primaryActionRef.current?.focus(), 500);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("demo-welcome-open");
    };
  }, [visible]);

  function dismiss(openAi = false) {
    try { window.sessionStorage.setItem(STORAGE_KEY, "seen"); } catch { /* no-op */ }
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      setClosing(false);
      if (openAi) window.dispatchEvent(new Event("ikisu:open-ai"));
    }, 420);
  }

  if (!visible) return null;

  return (
    <section
      className={`demo-welcome${closing ? " is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-welcome-title"
      aria-describedby="demo-welcome-description"
    >
      <img className="demo-welcome-background" src="/images/hero-agva.webp" alt="" />
      <div className="demo-welcome-shade" />

      <header className="demo-welcome-header">
        <div className="demo-welcome-studio" aria-label="Yıldırım Build">
          <span>YB</span>
          <div><strong>YILDIRIM.BUILD</strong><small>DİJİTAL DENEYİM STÜDYOSU</small></div>
        </div>
        <button className="demo-welcome-skip" type="button" onClick={() => dismiss()}>
          Siteye geç <span aria-hidden="true">→</span>
        </button>
      </header>

      <div className="demo-welcome-content">
        <div className="demo-welcome-copy">
          <span className="demo-welcome-kicker">CANLI EMLAK DENEYİMİ · PORTFÖY PROJESİ</span>
          <h1 id="demo-welcome-title">Bir emlak sitesi değil.<br /><em>Satışı yöneten dijital danışman.</em></h1>
          <p id="demo-welcome-description">
            Portföy vitrini, yapay zekâ danışmanı ve konuşarak yönetilen ilan sistemi tek deneyimde buluşuyor.
            Bu örneği gezin; markanıza özel neler yapabileceğimizi canlı olarak görün.
          </p>

          <div className="demo-welcome-actions">
            <button ref={primaryActionRef} className="demo-welcome-primary" type="button" onClick={() => dismiss()}>
              Canlı demoyu keşfet <span aria-hidden="true">↗</span>
            </button>
            <button className="demo-welcome-secondary" type="button" onClick={() => dismiss(true)}>
              <span aria-hidden="true">✦</span> AI danışmanı aç
            </button>
          </div>

          <p className="demo-welcome-note">
            Yıldırım Build tarafından emlak markaları için geliştirilen örnek sistemdir.
            Markanıza, renklerinize ve iş akışınıza göre uyarlanabilir.
          </p>
        </div>

        <aside className="demo-welcome-capabilities" aria-label="Sistemin yetenekleri">
          <article><span>01</span><div><strong>Portföye hâkim AI</strong><p>Doğal dili anlar, doğru ilanı bulur ve müşteriyi ilan sayfasına götürür.</p></div></article>
          <article><span>02</span><div><strong>Konuşarak yönetim</strong><p>Yönetici ilanı adım adım oluşturur; görseli, fiyatı ve yayın durumunu yönetir.</p></div></article>
          <article><span>03</span><div><strong>Dönüşüm odaklı</strong><p>İlan bağlamını bilen danışman, müşteriyi doğru iletişim aksiyonuna taşır.</p></div></article>
          <article><span>04</span><div><strong>Her ekranda hazır</strong><p>Telefon, tablet ve masaüstünde aynı güçlü, premium deneyimi sunar.</p></div></article>

          <div className="demo-welcome-proof">
            <div><strong>{listingCount}</strong><span>YAYINDAKİ PORTFÖY</span></div>
            <div><strong>AI</strong><span>CANLI YÖNLENDİRME</span></div>
            <div><strong>7/24</strong><span>DİJİTAL VİTRİN</span></div>
          </div>
        </aside>
      </div>

      <div className="demo-welcome-scroll" aria-hidden="true"><span /> Aşağıda canlı demo var</div>
    </section>
  );
}
