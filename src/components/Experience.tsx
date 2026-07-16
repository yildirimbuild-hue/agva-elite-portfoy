"use client";

import { useEffect, useMemo, useState } from "react";

type Listing = {
  ilan_id: string;
  ilan_basligi: string;
  fiyat: number | null;
  para_birimi: string;
  url: string;
  konum: string;
  satici_tipi: string;
  gorsel_url: string;
  tarama_tarihi: string;
  kategori: string;
  kod: string;
  etiket: string;
  ozet: string;
  nitelikler: string[];
  hikaye: string;
  status: string;
};

const categories = ["Tümü", "Nehir", "Orman", "Kıyı"];
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={diagonal ? "icon diagonal" : "icon"}>
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function asset(path: string) {
  return `${basePath}${path}`;
}

export default function Experience({ listings }: { listings: Listing[] }) {
  const [category, setCategory] = useState("Tümü");
  const [selected, setSelected] = useState<Listing | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  const filtered = useMemo(
    () => (category === "Tümü" ? listings : listings.filter((item) => item.kategori === category)),
    [category, listings],
  );

  useEffect(() => {
    const onScroll = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(available > 0 ? window.scrollY / available : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll("[data-reveal]").forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [category]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <div className="scroll-line" style={{ transform: `scaleX(${progress})` }} />

      <header className={progress > 0.015 ? "site-header scrolled" : "site-header"}>
        <a className="brand" href="#top" aria-label="İKİSU ana sayfa" onClick={closeMenu}>
          <span className="brand-mark">İK</span>
          <span className="brand-copy">
            <strong>İKİSU</strong>
            <small>PRIVATE ESTATES · AĞVA</small>
          </span>
        </a>

        <nav className={menuOpen ? "nav-links open" : "nav-links"} aria-label="Ana menü">
          <a href="#secki" onClick={closeMenu}>Seçki</a>
          <a href="#agva" onClick={closeMenu}>Ağva</a>
          <a href="#yaklasim" onClick={closeMenu}>Yaklaşım</a>
          <a className="nav-cta" href="#veri" onClick={closeMenu}>Özel portföy</a>
        </nav>

        <button
          className="menu-button"
          type="button"
          aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span />
          <span />
        </button>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <img
            className="hero-image"
            src={asset("/images/hero-agva.webp")}
            alt="Ağva'da nehir kıyısında, ormanla çevrili çağdaş bir ev"
            fetchPriority="high"
          />
          <div className="hero-shade" />
          <div className="hero-noise" />

          <div className="hero-content">
            <div className="eyebrow hero-eyebrow">
              <span>01</span>
              <span>Özel seçki · 2026</span>
            </div>
            <h1 id="hero-title">
              İki nehir arasında,
              <em>başka bir hayat.</em>
            </h1>
            <p>
              Ağva’nın nehir, orman ve kıyı hattındaki seçkin yaşam alanlarını ilan gibi değil,
              birer hikâye gibi sunuyoruz.
            </p>
            <div className="hero-actions">
              <a className="button button-light" href="#secki">
                Seçkiyi keşfet <Arrow />
              </a>
              <button className="text-button" type="button" onClick={() => setSelected(listings[0])}>
                Sunum modunu aç <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>

          <div className="hero-foot">
            <span>AĞVA · ŞİLE · İSTANBUL</span>
            <span className="hero-scroll"><i /> Kaydırarak keşfet</span>
          </div>
        </section>

        <section className="statement page-pad" data-reveal>
          <div className="section-number">01 / SEÇKİ</div>
          <div className="statement-copy">
            <p className="kicker">Sadece metrekare değil.</p>
            <h2>Bir evin değerini, <em>orada başlayacak hayatla</em> birlikte anlatıyoruz.</h2>
          </div>
          <p className="statement-note">
            Az sayıda, doğru portföy. Her mülk için ayrı görsel dil, yer hikâyesi ve özel sunum.
            Gürültü yerine seçicilik.
          </p>
        </section>

        <section className="collection page-pad" id="secki" aria-labelledby="collection-title">
          <div className="collection-head" data-reveal>
            <div>
              <span className="eyebrow dark"><span>Seçili yaşamlar</span></span>
              <h2 id="collection-title">Özel koleksiyon</h2>
            </div>
            <p>
              Aşağıdaki kayıtlar tasarım ve veri akışını göstermek için hazırlanmış temsili
              sunumlardır. Canlı portföy bağlandığında içerik aynı yapı içinde güncellenir.
            </p>
          </div>

          <div className="filter-row" role="group" aria-label="Portföy kategorileri" data-reveal>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={item === category ? "filter active" : "filter"}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
            <span className="result-count">0{filtered.length} seçki</span>
          </div>

          <div className="listing-grid">
            {filtered.map((listing, index) => (
              <article
                className="listing-card"
                key={listing.ilan_id}
                data-reveal
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <button type="button" className="card-hit" onClick={() => setSelected(listing)}>
                  <span className="sr-only">{listing.ilan_basligi} sunumunu aç</span>
                </button>
                <div className="card-image-wrap">
                  <img src={asset(listing.gorsel_url)} alt={`${listing.ilan_basligi} konsept görünümü`} />
                  <span className="demo-label">{listing.etiket}</span>
                  <span className="card-index">0{index + 1}</span>
                </div>
                <div className="card-copy">
                  <div>
                    <span>{listing.kategori} · {listing.kod}</span>
                    <h3>{listing.ilan_basligi}</h3>
                  </div>
                  <div className="round-arrow"><Arrow diagonal /></div>
                </div>
                <p>{listing.ozet}</p>
                <div className="feature-row">
                  {listing.nitelikler.map((feature) => <span key={feature}>{feature}</span>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="place" id="agva" aria-labelledby="place-title">
          <div className="place-visual" aria-hidden="true">
            <div className="topography" />
            <span className="river river-one" />
            <span className="river river-two" />
            <span className="place-dot" />
            <div className="place-coordinates">41.1386° N<br />29.8564° E</div>
            <div className="place-name">AĞVA</div>
          </div>
          <div className="place-copy page-pad" data-reveal>
            <span className="eyebrow"><span>02 / YER DUYGUSU</span></span>
            <h2 id="place-title">Suyun, ormanın ve kıyının <em>aynı cümlede buluştuğu yer.</em></h2>
            <p>
              Resmî adıyla Yeşilçay; bir yanında Yeşilçay, diğer yanında Göksu, önünde Karadeniz.
              İstanbul’a yaklaşık 97 km mesafedeki Ağva’nın gerçek ayrıcalığı, doğaya yakınlıktan
              çok doğanın içinde kalabilmesidir.
            </p>
            <div className="place-stats">
              <div><strong>02</strong><span>nehir arasında</span></div>
              <div><strong>97</strong><span>km · İstanbul</span></div>
              <div><strong>01</strong><span>özenli seçki</span></div>
            </div>
            <a className="inline-link" href="https://sile.gov.tr/agva" target="_blank" rel="noreferrer">
              Bölge kaynağını incele <Arrow />
            </a>
          </div>
        </section>

        <section className="approach page-pad" id="yaklasim" aria-labelledby="approach-title">
          <div className="approach-title" data-reveal>
            <span className="eyebrow dark"><span>03 / YAKLAŞIM</span></span>
            <h2 id="approach-title">İlan değil, <em>özel sunum.</em></h2>
          </div>
          <div className="approach-steps">
            {[
              ["01", "Seç", "Her portföy listeye girmez. Yer, mimari, hikâye ve potansiyel birlikte değerlendirilir."],
              ["02", "Anlat", "Fotoğraf, metin, konum bağlamı ve yaşam senaryosu tek bir editoryal dilde buluşur."],
              ["03", "Sun", "Nitelikli alıcıya, kalabalık ilan ekranından uzak; sakin, hızlı ve kişisel bir deneyim verilir."],
            ].map(([number, title, copy]) => (
              <article key={number} data-reveal>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="data-note page-pad" id="veri" data-reveal>
          <span className="eyebrow"><span>GITHUB TABANLI PORTFÖY</span></span>
          <div>
            <h2>Yeni portföy eklendiğinde, <em>site sessizce güncellenir.</em></h2>
            <p>
              Veri modeli ilan kimliği, başlık, fiyat, konum, satıcı tipi, görsel ve tarama tarihi
              alanlarını doğrular; mükerrer kayıtları yayınlamadan engeller.
            </p>
          </div>
          <a className="button button-outline" href="#secki">Sunumu yeniden gör <Arrow /></a>
        </section>
      </main>

      <footer className="footer page-pad">
        <div className="footer-brand">İKİSU</div>
        <div className="footer-grid">
          <div>
            <span>PRIVATE ESTATES</span>
            <p>Ağva’nın seçkin yaşam alanları için sakin, editoryal ve veriyle yaşayan portföy deneyimi.</p>
          </div>
          <div>
            <span>KEŞFET</span>
            <a href="#secki">Özel seçki</a>
            <a href="#agva">Ağva hikâyesi</a>
            <a href="#yaklasim">Yaklaşım</a>
          </div>
          <div>
            <span>DURUM</span>
            <p>Konsept sürüm · Temsili içerik</p>
            <p>Canlı veri bağlantısına hazır</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 İKİSU PRIVATE ESTATES</span>
          <a href="#top">Yukarı dön ↑</a>
        </div>
      </footer>

      {selected && (
        <div className="presentation" role="dialog" aria-modal="true" aria-labelledby="presentation-title">
          <button className="presentation-backdrop" type="button" onClick={() => setSelected(null)} aria-label="Sunumu kapat" />
          <div className="presentation-panel">
            <button className="presentation-close" type="button" onClick={() => setSelected(null)} aria-label="Kapat">
              <span />
              <span />
            </button>
            <div className="presentation-image">
              <img src={asset(selected.gorsel_url)} alt={`${selected.ilan_basligi} konsept görünümü`} />
              <div className="presentation-count">İKİSU / {selected.kod}</div>
              <div className="presentation-caption">{selected.etiket} · Yapay zekâ üretimi görsel</div>
            </div>
            <div className="presentation-copy">
              <span className="eyebrow dark"><span>{selected.kategori} · {selected.kod}</span></span>
              <h2 id="presentation-title">{selected.ilan_basligi}</h2>
              <p className="presentation-location">{selected.konum}</p>
              <p className="presentation-story">{selected.hikaye}</p>
              <div className="presentation-features">
                {selected.nitelikler.map((feature, index) => (
                  <div key={feature}><span>0{index + 1}</span>{feature}</div>
                ))}
              </div>
              <div className="presentation-disclaimer">
                <strong>Konsept kayıt</strong>
                <span>Gerçek ilan değildir. Canlı portföy verisi bağlandığında alanlar otomatik doldurulur.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
