"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Giriş başarısız." }));
      setError(payload.error);
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-visual">
        <img src="/images/forest-house.webp" alt="Ağva orman evi" />
        <a href="/" className="admin-back-link">← Siteye dön</a>
        <div><span>İKİSU EMLAK</span><h1>Portföyünüz,<br /><em>tek merkezde.</em></h1></div>
      </section>
      <section className="admin-login-form-wrap">
        <div className="admin-login-form">
          <div className="admin-login-mark">İK</div>
          <span className="admin-overline">YÖNETİM PANELİ</span>
          <h2>Hoş geldiniz</h2>
          <p>İlan eklemek ve portföyü yönetmek için giriş yapın.</p>
          <form onSubmit={submit}>
            <label><span>Yönetici şifresi</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required /></label>
            {error && <div className="admin-form-error">{error}</div>}
            <button type="submit" disabled={loading}>{loading ? "Giriş yapılıyor..." : "Panele giriş yap →"}</button>
          </form>
          <small>Oturum HttpOnly çerezle korunur ve 8 saat sonra kapanır.</small>
        </div>
      </section>
    </main>
  );
}
