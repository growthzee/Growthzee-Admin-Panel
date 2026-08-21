"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  {
    href: "/dashboard", label: "Overview", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
    ),
  },
  {
    href: "/dashboard/employees", label: "Employees", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
  },
  {
    href: "/dashboard/clients", label: "Clients", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.77-.77-.77a5.4 5.4 0 1 0-7.65 7.65l.77.77L12 20.66l7.65-7.66.77-.77a5.4 5.4 0 0 0 0-7.65z"/></svg>
    ),
  },
  {
    href: "/dashboard/tasks", label: "Tasks", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>
    ),
  },
  {
    href: "/dashboard/attendance", label: "Attendance", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ),
  },
  {
    href: "/dashboard/performance", label: "Performance", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    ),
  },
  {
    href: "/dashboard/settings", label: "Settings", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    ),
  },
];

type SearchEmployee = { id: string; name: string; email: string; position: string; department: string };
type SearchClient = { id: string; name: string; email: string; company?: string };

type LeaveRequest = {
  id: string; reason: string; startDate: string; endDate: string; days: number;
  note?: string | null; status: string; createdAt: string;
  employee: { id: string; name: string; department: string; position: string };
};

function fmtRange(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return s.toDateString() === e.toDateString()
    ? s.toLocaleDateString("en-US", opts)
    : `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}`;
}

function Notifications() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leave-requests?status=PENDING");
      const d = await res.json();
      setRequests(Array.isArray(d) ? d : []);
    } catch { setRequests([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    // Keep the badge fresh while the dashboard is open
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  async function review(id: string, status: "APPROVED" | "REJECTED") {
    setActing(id);
    await fetch(`/api/leave-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setActing(null);
  }

  const count = requests.length;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button className="topbar-icon-btn" title="Leave requests" onClick={() => setOpen((o) => !o)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && <span className="notif-count">{count > 9 ? "9+" : count}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <p className="section-title">Leave requests</p>
            <span style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>
              {count} pending
            </span>
          </div>

          {loading ? (
            <div className="search-dropdown-empty">Loading…</div>
          ) : count === 0 ? (
            <div className="search-dropdown-empty">
              <p style={{ fontSize: 20, marginBottom: 6 }}>🎉</p>
              No pending leave requests
            </div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="notif-item">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                  <span className="search-dropdown-avatar">{r.employee.name.charAt(0).toUpperCase()}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--tx-primary)" }}>
                      {r.employee.name}
                    </p>
                    <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>
                      {r.employee.department} · requested {fmtRange(r.startDate, r.endDate)}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                      <span className="badge badge-purple">{r.reason.replace(/_/g, " ")}</span>
                      <span className="badge badge-gray">{r.days} day{r.days === 1 ? "" : "s"}</span>
                    </div>
                    {r.note && (
                      <p style={{ fontSize: 11.5, color: "var(--tx-secondary)", marginTop: 6, lineHeight: 1.45 }}>
                        “{r.note}”
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
                      <button className="btn btn-primary btn-sm" disabled={acting === r.id} onClick={() => review(r.id, "APPROVED")}>
                        {acting === r.id
                          ? <span className="spinner" style={{ width: 11, height: 11, borderTopColor: "rgba(255,255,255,0.7)" }} />
                          : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                        Approve
                      </button>
                      <button className="btn btn-danger btn-sm" disabled={acting === r.id} onClick={() => review(r.id, "REJECTED")}>
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<SearchEmployee[]>([]);
  const [clients, setClients] = useState<SearchClient[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setEmployees([]); setClients([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const [er, cr] = await Promise.all([
          fetch(`/api/employees?search=${encodeURIComponent(q)}`),
          fetch(`/api/clients?search=${encodeURIComponent(q)}`),
        ]);
        const [ed, cd] = await Promise.all([er.json(), cr.json()]);
        setEmployees(Array.isArray(ed) ? ed.slice(0, 5) : []);
        setClients(Array.isArray(cd) ? cd.slice(0, 5) : []);
      } catch {
        setEmployees([]); setClients([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  function goTo(path: string) {
    setOpen(false);
    setQuery("");
    router.push(path);
  }

  const hasQuery = query.trim().length > 0;
  const hasResults = employees.length > 0 || clients.length > 0;

  return (
    <div className="topbar-search" ref={wrapRef} style={{ position: "relative" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        placeholder="Search anything…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { if (hasQuery) setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && employees[0]) goTo(`/dashboard/employees/${employees[0].id}`);
          else if (e.key === "Enter" && clients[0]) goTo(`/dashboard/clients/${clients[0].id}`);
        }}
      />
      {open && hasQuery && (
        <div className="search-dropdown">
          {loading ? (
            <div className="search-dropdown-empty">Searching…</div>
          ) : !hasResults ? (
            <div className="search-dropdown-empty">No results for &quot;{query}&quot;</div>
          ) : (
            <>
              {clients.length > 0 && (
                <>
                  <p className="search-dropdown-label">Clients</p>
                  {clients.map((c) => (
                    <button key={c.id} className="search-dropdown-item" onClick={() => goTo(`/dashboard/clients/${c.id}`)}>
                      <span className="search-dropdown-avatar">{c.name.charAt(0).toUpperCase()}</span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span className="search-dropdown-title">{c.name}</span>
                        <span className="search-dropdown-sub">{c.company || c.email}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}
              {employees.length > 0 && (
                <>
                  <p className="search-dropdown-label">Employees</p>
                  {employees.map((e) => (
                    <button key={e.id} className="search-dropdown-item" onClick={() => goTo(`/dashboard/employees/${e.id}`)}>
                      <span className="search-dropdown-avatar">{e.name.charAt(0).toUpperCase()}</span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span className="search-dropdown-title">{e.name}</span>
                        <span className="search-dropdown-sub">{e.position} · {e.department}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

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
    <button className="topbar-icon-btn" onClick={toggle} title={dark ? "Switch to light" : "Switch to dark"}>
      {dark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
      {/* Sidebar — always dark, matches brand regardless of theme toggle */}
      <aside className="sb" style={{
        width: 234,
        flexShrink: 0,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
      }}>
        {/* Brand header */}
        <div style={{
          padding: "16px 14px",
          borderBottom: "1px solid var(--sb-border)",
          display: "flex", alignItems: "center", gap: 10,
          minHeight: 56, flexShrink: 0,
        }}>
          <div className="sb-logo-mark">G</div>
          <div style={{ minWidth: 0 }}>
            <p className="sb-brand">GrowthZee CRM</p>
            <p className="sb-brand-sub">Team &amp; Client Operations</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "4px 10px", overflowY: "auto", overflowX: "hidden" }}>
          <p className="sb-section-label">Workspace</p>
          {NAV.map(({ href, label, icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className={`sb-nav-item${isActive ? " active" : ""}`}>
                {icon}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Support card */}
        <div className="sb-support-card">
          <p className="title">Need help?</p>
          <p className="sub">Our support team is here for you</p>
          <button className="sb-support-btn">Contact support</button>
        </div>

        {/* Footer — user row */}
        <div style={{ padding: "10px", borderTop: "1px solid var(--sb-border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 4px" }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
              background: "rgba(255,255,255,0.08)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10.5, fontWeight: 700,
            }}>
              {adminName.charAt(0).toUpperCase()}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--sb-text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {adminName}
            </p>
            <button
              onClick={logout}
              title="Sign out"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, background: "transparent", border: "none", cursor: "pointer", color: "var(--sb-text-dim)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top header bar */}
        <div className="topbar">
          <GlobalSearch />
          <div style={{ flex: 1 }} />
          <ThemeToggle />
          <Notifications />
          <div className="topbar-user">
            <div>
              <p className="name" style={{ textAlign: "right" }}>{adminName}</p>
              <p className="role" style={{ textAlign: "right" }}>{adminEmail || "Administrator"}</p>
            </div>
            <div className="topbar-avatar">{adminName.charAt(0).toUpperCase()}</div>
          </div>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, overflow: "auto", background: "var(--page-bg)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
