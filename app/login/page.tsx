"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const d = await res.json();
      if (!res.ok) setError(d.error || "Login failed");
      else { router.push("/dashboard"); router.refresh(); }
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {/* Theme toggle */}
      <div style={{ position: "fixed", top: 16, right: 16 }}>
        <button className="theme-btn" onClick={toggleTheme} title="Toggle theme">
          {dark ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
      </div>

      <div className="anim-up" style={{ width: "100%", maxWidth: 380 }}>
        {/* Workspace icon + title */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: "var(--tx-primary)", color: "var(--tx-inverse)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>
            🏢
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--tx-primary)", letterSpacing: "-0.02em" }}>Welcome back</h1>
          <p style={{ fontSize: 13.5, color: "var(--tx-tertiary)", marginTop: 5 }}>Sign in to your EmpAdmin workspace</p>
        </div>

        {/* Form card */}
        <div className="card" style={{ padding: 24, boxShadow: "var(--shadow-md)" }}>
          {error && (
            <div style={{ marginBottom: 14, padding: "9px 12px", background: "var(--red-bg)", borderRadius: "var(--r-md)", color: "var(--red)", fontSize: 13 }}>
              {error}
            </div>
          )}
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--tx-secondary)", marginBottom: 6 }}>Email address</label>
              <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@company.com" autoFocus />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--tx-secondary)", marginBottom: 6 }}>Password</label>
              <input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", marginTop: 4, height: 38 }}>
              {loading && <span className="spinner" style={{ width: 14, height: 14, borderTopColor: "rgba(255,255,255,0.7)" }} />}
              {loading ? "Signing in…" : "Continue with email"}
            </button>
          </form>

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", textAlign: "center" }}>
            <a href="/api/auth/seed" style={{ fontSize: 12.5, color: "var(--tx-tertiary)", textDecoration: "none", transition: "color .12s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--tx-primary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--tx-tertiary)")}>
              First time? Create admin account →
            </a>
          </div>
        </div>

        {/* Portal links */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 18 }}>
          {[["Employee portal", "/employee-login"], ["Client portal", "/client-login"]].map(([l, h]) => (
            <a key={h} href={h} style={{ fontSize: 12.5, color: "var(--tx-tertiary)", textDecoration: "none", transition: "color .12s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--tx-primary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--tx-tertiary)")}>
              {l}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
