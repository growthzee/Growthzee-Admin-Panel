"use client";
import { useState, useEffect } from "react";

type Props = {
  /** Small label above the heading, e.g. "Admin workspace" */
  eyebrow: string;
  heading: string;
  subheading: string;
  /** Emoji or short glyph shown in the portal badge */
  glyph: string;
  error?: string;
  children: React.ReactNode;
  /** Links to the other portals */
  links: { label: string; href: string }[];
  footerNote?: React.ReactNode;
};

const HIGHLIGHTS = [
  { icon: "📋", title: "Tasks in one place", body: "Internal and client work tracked side by side." },
  { icon: "🗓️", title: "Attendance & leave", body: "Request time off and track every working day." },
  { icon: "📈", title: "Performance insight", body: "Completion rates per person, team and client." },
];

export default function AuthShell({ eyebrow, heading, subheading, glyph, error, children, links, footerNote }: Props) {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <div className="auth-page">
      {/* ── Brand / marketing panel ─────────────────────────────── */}
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 40 }}>
            <div className="auth-logo-mark">G</div>
            <div>
              <p className="auth-brand-name">GrowthZee CRM</p>
              <p className="auth-brand-sub">Team &amp; Client Operations</p>
            </div>
          </div>

          <h2 className="auth-brand-headline">
            Everything your team needs,<br />in one clean workspace.
          </h2>
          <p className="auth-brand-body">
            Clients, employees, tasks, attendance and leave — tracked together so nothing slips.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 34 }}>
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} style={{ display: "flex", gap: 12 }}>
                <span className="auth-highlight-icon">{h.icon}</span>
                <div>
                  <p className="auth-highlight-title">{h.title}</p>
                  <p className="auth-highlight-body">{h.body}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="auth-brand-foot">Organised today. Scaled tomorrow.</p>
        </div>
      </div>

      {/* ── Form panel ──────────────────────────────────────────── */}
      <div className="auth-form-panel">
        <button className="theme-btn auth-theme-btn" onClick={toggleTheme} title="Toggle theme">
          {dark ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          )}
        </button>

        <div className="auth-form-inner anim-up">
          <div style={{ marginBottom: 26 }}>
            <span className="auth-eyebrow">
              <span style={{ fontSize: 13 }}>{glyph}</span>{eyebrow}
            </span>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--tx-primary)", letterSpacing: "-0.02em", marginTop: 14 }}>
              {heading}
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--tx-tertiary)", marginTop: 6 }}>{subheading}</p>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "10px 12px", background: "var(--red-bg)", borderRadius: "var(--r-md)", color: "var(--red)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {children}

          {footerNote && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", textAlign: "center" }}>
              {footerNote}
            </div>
          )}

          <div className="auth-links">
            {links.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
