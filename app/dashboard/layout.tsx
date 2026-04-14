"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard",             label: "Overview",    emoji: "🏠" },
  { href: "/dashboard/employees",   label: "Employees",   emoji: "👥" },
  { href: "/dashboard/clients",     label: "Clients",     emoji: "🤝" },
  { href: "/dashboard/tasks",       label: "Tasks",       emoji: "✅" },
  { href: "/dashboard/performance", label: "Performance", emoji: "📊" },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }
  return (
    <button className="theme-btn" onClick={toggle} title={dark ? "Switch to light" : "Switch to dark"}>
      {dark ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [adminEmail, setAdminEmail] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      const m = document.cookie.match(/auth-token=([^;]+)/);
      if (m) {
        const p = JSON.parse(atob(m[1].split(".")[1]));
        if (p.name) setAdminName(p.name);
        if (p.email) setAdminEmail(p.email);
      }
    } catch {}
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login"); router.refresh();
  }, [router]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--page-bg)" }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 52 : 240,
        flexShrink: 0,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        transition: "width 0.22s cubic-bezier(.16,1,.3,1)",
        overflow: "hidden",
        position: "sticky", top: 0, height: "100vh",
      }}>
        {/* Workspace header */}
        <div style={{
          padding: collapsed ? "10px" : "10px 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 8,
          minHeight: 50, flexShrink: 0,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: "var(--tx-primary)", color: "var(--tx-inverse)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, flexShrink: 0, fontWeight: 700,
          }}>
            {adminName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {adminName}
                </p>
                <p style={{ fontSize: 11, color: "var(--tx-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {adminEmail || "EmpAdmin workspace"}
                </p>
              </div>
              <ThemeToggle />
            </>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 6px", overflowY: "auto", overflowX: "hidden" }}>
          {!collapsed && <p className="nav-section-label">Workspace</p>}
          {NAV.map(({ href, label, emoji }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={`nav-item${isActive ? " active" : ""}`}
                title={collapsed ? label : undefined}
                style={{ justifyContent: collapsed ? "center" : "flex-start", marginBottom: 1 }}>
                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "6px", borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {collapsed ? (
            <>
              <ThemeToggle />
              <button className="btn-ghost btn-icon" style={{ width: "100%" }} onClick={() => setCollapsed(false)} title="Expand">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 4px" }}>
              <div className="avatar" style={{ fontSize: 10.5 }}>{adminName.charAt(0).toUpperCase()}</div>
              <p style={{ fontSize: 12.5, color: "var(--tx-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {adminName}
              </p>
              <button className="btn-ghost btn-icon" onClick={logout} title="Sign out">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
              <button className="btn-ghost btn-icon" onClick={() => setCollapsed(true)} title="Collapse">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", background: "var(--page-bg)" }}>
        {children}
      </main>
    </div>
  );
}
