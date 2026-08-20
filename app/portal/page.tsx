"use client";
import { useState, useEffect, useMemo } from "react";
import { TASK_CATEGORIES, getCategoryEmoji, getSubCategoryEmoji } from "@/lib/taskCategories";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { MONTHS, money, invoiceTotals, INVOICE_STATUS_BADGE, INVOICE_STATUS_LABEL } from "@/lib/billing";

type Employee = { id: string; name: string; position: string };
type Task = {
  id: string; title: string; description?: string;
  category?: string | null; subCategory?: string | null; taskType?: string | null;
  status: string; priority: string; startDate: string; endDate: string;
  completedAt?: string; employee?: Employee | null;
};
type MonthlyTarget = { id: string; year: number; month: number; target: number; note?: string | null };
type InvoiceItem = { id: string; description: string; quantity: number; unitPrice: number };
type Invoice = {
  id: string; number: string; issueDate: string; dueDate?: string | null;
  periodYear?: number | null; periodMonth?: number | null; currency: string;
  taxPercent: number; notes?: string | null; status: string; items: InvoiceItem[];
};
type Client = {
  id: string; name: string; email: string; company?: string;
  clientTasks: Task[]; monthlyTargets: MonthlyTarget[]; invoices: Invoice[];
};

const S_BADGE: Record<string, string> = { PENDING: "badge-gray", IN_PROGRESS: "badge-blue", COMPLETED: "badge-green", CHANGES_REQUIRED: "badge-amber", OVERDUE: "badge-red" };
const S_LABEL: Record<string, string> = { PENDING: "Pending", IN_PROGRESS: "In progress", COMPLETED: "Delivered", CHANGES_REQUIRED: "Changes needed", OVERDUE: "Overdue" };
const STATUS_COLORS: Record<string, string> = { COMPLETED: "var(--green)", IN_PROGRESS: "var(--blue)", PENDING: "var(--amber)", OVERDUE: "var(--red)" };
const PAGE_SIZE = 8;

/** Colour per department so each reads distinctly */
const CATEGORY_COLORS: Record<string, string> = {
  "Social Media Management": "#ec4899",
  "Paid Ads (Performance Marketing)": "#7c3aed",
  "Website / SEO": "#2383E2",
  "E-commerce Management": "#0F9D58",
  "Client Management": "#0891b2",
  "Reporting & Analysis": "#D97706",
  "Strategy & Planning": "#db2777",
  "Video Production": "#E11D48",
  "Automation / Tools": "#6366f1",
  Uncategorized: "#94a3b8",
};
const ALL_CATEGORY_LABELS = TASK_CATEGORIES.map((c) => c.label);

function isOverdue(t: Task) { return t.status !== "COMPLETED" && new Date(t.endDate) < new Date(); }
function dueLabel(date: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const t = new Date(date);
  const diff = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime() - start.getTime()) / 86400000);
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff === -1) return "1 day overdue";
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  return `In ${diff} days`;
}
function timeAgo(date: string) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function Donut({ segments, centerValue, centerLabel, size = 120 }: {
  segments: { label: string; count: number; color: string }[];
  centerValue: number | string; centerLabel: string; size?: number;
}) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.count, 0));
  let acc = 0;
  const parts = segments.map((s) => {
    const start = (acc / total) * 360;
    acc += s.count;
    return `${s.color} ${start}deg ${(acc / total) * 360}deg`;
  }).join(", ");
  const hasData = segments.some((s) => s.count > 0);
  return (
    <div className="donut-wrap" style={{ width: size, height: size, margin: "6px auto 14px" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: hasData ? `conic-gradient(${parts})` : "var(--hover-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "70%", height: "70%", borderRadius: "50%", background: "var(--card-bg)" }} />
      </div>
      <div className="donut-center">
        <span className="pct" style={{ fontSize: 20 }}>{centerValue}</span>
        <span className="lbl">{centerLabel}</span>
      </div>
    </div>
  );
}

function WeeklyChart({ tasks }: { tasks: Task[] }) {
  const now = new Date();
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = new Date(day.getTime() + 86400000);
    let count = 0;
    for (const t of tasks) {
      if (t.completedAt) {
        const cd = new Date(t.completedAt);
        if (cd >= day && cd < next) count++;
      }
    }
    days.push({ label: day.toLocaleDateString("en-US", { weekday: "short" }), count });
  }
  const max = Math.max(1, ...days.map((d) => d.count));
  const w = 100 / (days.length - 1);
  const points = days.map((d, i) => `${i * w},${40 - (d.count / max) * 36}`).join(" ");
  return (
    <div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: "100%", height: 96, display: "block" }}>
        <polyline points={`0,40 ${points} 100,40`} fill="url(#portalChartFill)" stroke="none" />
        <polyline points={points} fill="none" stroke="#7c3aed" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="portalChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {days.map((d, i) => <span key={i} style={{ fontSize: 10.5, color: "var(--tx-tertiary)" }}>{d.label}</span>)}
      </div>
    </div>
  );
}

export default function PortalPage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"work" | "progress" | "invoices">("work");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dark, setDark] = useState(false);

  const now = useMemo(() => new Date(), []);
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);

  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  useEffect(() => {
    fetch("/api/portal/me")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setClient(d); setLoading(false); })
      .catch(() => router.push("/client-login"));
  }, [router]);
  useEffect(() => { setPage(1); }, [search, statusFilter, categoryFilter]);

  function toggleTheme() {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }
  async function logout() {
    await fetch("/api/portal/logout", { method: "POST" });
    router.push("/client-login"); router.refresh();
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div>;
  if (!client) return null;

  const tasks = client.clientTasks;
  const invoices = client.invoices || [];
  const targets = client.monthlyTargets || [];

  const done = tasks.filter((t) => t.status === "COMPLETED").length;
  const active = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const pending = tasks.filter((t) => t.status === "PENDING").length;
  const changes = tasks.filter((t) => t.status === "CHANGES_REQUIRED").length;
  const overdue = tasks.filter((t) => isOverdue(t)).length;
  const rate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  // ── Departments ────────────────────────────────────────────────────────
  const grouped = new Map<string, Task[]>();
  for (const t of tasks) {
    const key = t.category || "Uncategorized";
    grouped.set(key, [...(grouped.get(key) || []), t]);
  }
  const orderedKeys = [
    ...ALL_CATEGORY_LABELS.filter((l) => grouped.has(l)),
    ...Array.from(grouped.keys()).filter((k) => !ALL_CATEGORY_LABELS.includes(k)),
  ];
  const departments = orderedKeys.map((label) => {
    const list = grouped.get(label) || [];
    const d = list.filter((t) => t.status === "COMPLETED").length;
    return { label, list, done: d, total: list.length, pct: list.length > 0 ? Math.round((d / list.length) * 100) : 0, color: CATEGORY_COLORS[label] || "#7c3aed" };
  });

  // ── Filtered task table ────────────────────────────────────────────────
  const filtered = tasks.filter((t) => {
    if (categoryFilter !== "All" && (t.category || "Uncategorized") !== categoryFilter) return false;
    if (statusFilter === "OVERDUE" ? !isOverdue(t) : statusFilter && t.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      const hay = [t.title, t.description, t.category, t.subCategory, t.taskType, t.employee?.name].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageTasks = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Monthly delivery progress ──────────────────────────────────────────
  function deliveredIn(y: number, m: number) {
    return tasks.filter((t) => {
      if (!t.completedAt) return false;
      const d = new Date(t.completedAt);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
  }
  const deliveredInMonth = deliveredIn(selYear, selMonth);
  const monthTarget = targets.find((t) => t.year === selYear && t.month === selMonth);
  const targetCount = monthTarget?.target ?? 0;
  const deliveredCount = deliveredInMonth.length;
  const monthPct = targetCount > 0 ? Math.min(100, Math.round((deliveredCount / targetCount) * 100)) : 0;
  const monthColor = monthPct >= 100 ? "var(--green)" : monthPct >= 60 ? "var(--amber)" : "var(--red)";

  const monthByDept = new Map<string, number>();
  for (const t of deliveredInMonth) {
    const key = t.category || "Uncategorized";
    monthByDept.set(key, (monthByDept.get(key) || 0) + 1);
  }

  // Current month for the right rail
  const curDelivered = deliveredIn(now.getFullYear(), now.getMonth() + 1).length;
  const curTarget = targets.find((t) => t.year === now.getFullYear() && t.month === now.getMonth() + 1)?.target ?? 0;
  const curPct = curTarget > 0 ? Math.min(100, Math.round((curDelivered / curTarget) * 100)) : 0;

  const upcoming = tasks.filter((t) => t.status !== "COMPLETED")
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()).slice(0, 5);
  const recent = tasks.filter((t) => t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()).slice(0, 6);

  const yearOptions = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);
  const unpaidTotal = invoices.filter((i) => i.status === "RAISED")
    .reduce((s, i) => s + invoiceTotals(i.items, i.taxPercent).total, 0);

  const STAT_CARDS = [
    { label: "Total Tasks", val: tasks.length, sub: `${departments.length} departments`, bg: "var(--purple-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" /></svg> },
    { label: "Delivered", val: done, sub: `${rate}% of all work`, bg: "var(--green-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F9D58" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
    { label: "In Progress", val: active, sub: "being worked on", bg: "var(--blue-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2383E2" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { label: "Pending", val: pending, sub: "not started", bg: "var(--amber-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> },
    { label: "Overdue", val: overdue, sub: "past due date", bg: "var(--red-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
    { label: "Completion Rate", val: `${rate}%`, sub: "across all tasks", bg: "var(--purple-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> },
  ];

  const statusSegments = [
    { label: "Delivered", count: done, color: STATUS_COLORS.COMPLETED },
    { label: "In progress", count: active, color: STATUS_COLORS.IN_PROGRESS },
    { label: "Pending", count: pending, color: STATUS_COLORS.PENDING },
    { label: "Overdue", count: overdue, color: STATUS_COLORS.OVERDUE },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="topbar-avatar">{(client.company || client.name).charAt(0).toUpperCase()}</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-primary)", lineHeight: 1.2 }}>{client.company || client.name}</p>
            <p style={{ fontSize: 11, color: "var(--tx-tertiary)", lineHeight: 1.2 }}>Client portal · GrowthZee CRM</p>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <span className="badge badge-green">{done} delivered</span>
        {overdue > 0 && <span className="badge badge-red">{overdue} overdue</span>}
        <button className="topbar-icon-btn" onClick={toggleTheme} title="Toggle theme">
          {dark
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={logout}>Sign out</button>
      </div>

      <div className="wide-section">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }} className="anim-up">
          <div>
            <h1 className="page-title" style={{ fontSize: 24 }}>Your projects</h1>
            <p style={{ fontSize: 13.5, color: "var(--tx-tertiary)", marginTop: 5 }}>
              {tasks.length} tasks · {departments.length} departments · {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="filter-tabs-wrap">
            {([["work", "Work"], ["progress", "Monthly progress"], ["invoices", "Invoices"]] as const).map(([k, l]) => (
              <button key={k} className={`filter-tab${view === k ? " active" : ""}`} onClick={() => setView(k)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="rail-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

            {/* ── Stat cards ─────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
              {STAT_CARDS.map((s, i) => (
                <div key={s.label} className={`stat-card anim-up d${(i % 4) + 1}`} style={{ padding: "14px 15px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <p className="label-text" style={{ fontSize: 9.5 }}>{s.label}</p>
                    <div className="icon-chip" style={{ background: s.bg, width: 28, height: 28 }}>{s.icon}</div>
                  </div>
                  <p className="stat-value" style={{ fontSize: 22 }}>{s.val}</p>
                  <p style={{ fontSize: 11, color: "var(--tx-tertiary)", marginTop: 4 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* ── Donut / trend / department bars ─────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1fr 1fr", gap: 16 }}>
              <div className="card anim-up d2" style={{ padding: "14px 16px" }}>
                <p className="section-title" style={{ marginBottom: 10 }}>Work Progress</p>
                <Donut segments={statusSegments} centerValue={`${rate}%`} centerLabel="Delivered" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {statusSegments.map((s) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span className="dot" style={{ background: s.color }} />
                      <span style={{ fontSize: 12, color: "var(--tx-secondary)", flex: 1 }}>{s.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-primary)" }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card anim-up d3" style={{ padding: "14px 16px" }}>
                <p className="section-title" style={{ marginBottom: 10 }}>Delivered (7 days)</p>
                <WeeklyChart tasks={tasks} />
              </div>

              <div className="card anim-up d4" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p className="section-title">Department Progress</p>
                  <span style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>{departments.length} depts</span>
                </div>
                {departments.length === 0 ? (
                  <div className="empty" style={{ padding: 20 }}><p>No work assigned yet</p></div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {departments.slice(0, 6).map((d) => (
                      <div key={d.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
                          <span style={{ fontSize: 12, color: "var(--tx-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-primary)", flexShrink: 0 }}>{d.pct}%</span>
                        </div>
                        <div className="dept-bar-track"><div className="dept-bar-fill" style={{ width: `${d.pct}%`, background: d.color }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Work view ──────────────────────────────────────── */}
            {view === "work" && (
              <div className="tab-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="card" style={{ overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <p className="section-title" style={{ marginRight: "auto" }}>All Deliverables ({filtered.length})</p>
                    <div className="filter-tabs-wrap">
                      {([["", "All"], ["PENDING", "Pending"], ["IN_PROGRESS", "Active"], ["COMPLETED", "Delivered"], ["CHANGES_REQUIRED", "Changes"], ["OVERDUE", "Overdue"]] as [string, string][]).map(([k, l]) => (
                        <button key={k} className={`filter-tab${statusFilter === k ? " active" : ""}`} onClick={() => setStatusFilter(k)}>{l}</button>
                      ))}
                    </div>
                    <select className="input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ width: "auto", maxWidth: 190, fontSize: 12.5 }}>
                      <option value="All">All departments</option>
                      {departments.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
                    </select>
                    <div className="search-wrap" style={{ maxWidth: 180 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                      <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search work…" />
                    </div>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="empty" style={{ padding: 60 }}>
                      <p style={{ fontSize: 24, marginBottom: 8 }}>📋</p>
                      <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>{tasks.length === 0 ? "No work assigned yet" : "Nothing matches your filters"}</p>
                      <p style={{ fontSize: 13 }}>{tasks.length === 0 ? "Tasks for your account will appear here" : "Try a different department, status or search"}</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ overflowX: "auto" }}>
                        <table className="data-table">
                          <thead>
                            <tr><th>Deliverable</th><th>Department</th><th>Handled by</th><th>Due</th><th>Status</th></tr>
                          </thead>
                          <tbody>
                            {pageTasks.map((task) => {
                              const od = isOverdue(task);
                              const cat = task.category || "Uncategorized";
                              return (
                                <tr key={task.id}>
                                  <td style={{ maxWidth: 250 }}>
                                    <p style={{ fontSize: 13, fontWeight: 500, color: task.status === "COMPLETED" ? "var(--tx-tertiary)" : "var(--tx-primary)", textDecoration: task.status === "COMPLETED" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {task.title}
                                    </p>
                                    {task.taskType && <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{task.taskType}</p>}
                                    {task.completedAt && <p style={{ fontSize: 11.5, color: "var(--green)" }}>✓ Delivered {formatDate(task.completedAt)}</p>}
                                  </td>
                                  <td>
                                    <span className="badge" style={{ background: `color-mix(in srgb, ${CATEGORY_COLORS[cat] || "#7c3aed"} 15%, transparent)`, color: CATEGORY_COLORS[cat] || "#7c3aed" }}>
                                      {getCategoryEmoji(cat)} {cat}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: 12.5, color: "var(--tx-secondary)", whiteSpace: "nowrap" }}>{task.employee?.name || "—"}</td>
                                  <td style={{ fontSize: 12.5, color: od ? "var(--red)" : "var(--tx-tertiary)", whiteSpace: "nowrap" }}>{formatDate(task.endDate)}</td>
                                  <td><span className={`badge ${od ? "badge-red" : S_BADGE[task.status] || "badge-gray"}`}>{od ? "Overdue" : S_LABEL[task.status] || task.status}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {totalPages > 1 && (
                        <div className="pager">
                          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
                          ))}
                          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Department breakdown cards */}
                {departments
                  .filter((d) => categoryFilter === "All" || d.label === categoryFilter)
                  .map((dept) => (
                    <div key={dept.label} className="card" style={{ overflow: "hidden", borderTop: `3px solid ${dept.color}` }}>
                      <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--tx-primary)" }}>{getCategoryEmoji(dept.label)} {dept.label}</p>
                          <span style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>
                            {dept.done}/{dept.total} delivered · <strong style={{ color: dept.color }}>{dept.pct}%</strong>
                          </span>
                        </div>
                        <div className="dept-bar-track"><div className="dept-bar-fill" style={{ width: `${dept.pct}%`, background: dept.color }} /></div>
                      </div>
                      {dept.list.slice(0, 6).map((task) => {
                        const od = isOverdue(task);
                        return (
                          <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
                            <span style={{
                              width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                              border: task.status === "COMPLETED" ? "none" : "1.5px solid var(--border-md)",
                              background: task.status === "COMPLETED" ? "var(--green)" : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {task.status === "COMPLETED" && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, color: task.status === "COMPLETED" ? "var(--tx-tertiary)" : "var(--tx-primary)", textDecoration: task.status === "COMPLETED" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {task.title}
                              </p>
                              <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>
                                {task.subCategory ? `${getSubCategoryEmoji(dept.label, task.subCategory)} ${task.subCategory}` : ""}
                                {task.employee ? ` · ${task.employee.name}` : ""}
                              </p>
                            </div>
                            <span className={`badge ${od ? "badge-red" : S_BADGE[task.status] || "badge-gray"}`} style={{ flexShrink: 0 }}>
                              {od ? "Overdue" : S_LABEL[task.status] || task.status}
                            </span>
                          </div>
                        );
                      })}
                      {dept.list.length > 6 && (
                        <div style={{ padding: "9px 18px", fontSize: 12, color: "var(--tx-tertiary)" }}>
                          + {dept.list.length - 6} more in this department — use the table above to see them all
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* ── Monthly progress view ──────────────────────────── */}
            {view === "progress" && (
              <div className="tab-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="card" style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                    <div>
                      <p className="section-title">Deliveries in {MONTHS[selMonth - 1]} {selYear}</p>
                      <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 2 }}>
                        {targetCount > 0 ? `Target of ${targetCount} deliveries agreed for this month` : "No delivery target set for this month yet"}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <select className="input" value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))} style={{ width: "auto", fontSize: 12.5 }}>
                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                      </select>
                      <select className="input" value={selYear} onChange={(e) => setSelYear(Number(e.target.value))} style={{ width: "auto", fontSize: 12.5 }}>
                        {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 34, fontWeight: 700, color: monthColor, letterSpacing: "-0.03em" }}>{deliveredCount}</span>
                    <span style={{ fontSize: 15, color: "var(--tx-tertiary)" }}>{targetCount > 0 ? `of ${targetCount} deliveries` : "deliveries completed"}</span>
                    {targetCount > 0 && (
                      <span className="badge" style={{ marginLeft: "auto", background: `color-mix(in srgb, ${monthColor} 16%, transparent)`, color: monthColor, fontSize: 12 }}>
                        {monthPct}% of target
                      </span>
                    )}
                  </div>

                  {targetCount > 0 && (
                    <>
                      <div className="progress-track" style={{ height: 10 }}>
                        <div className="progress-fill" style={{ width: `${monthPct}%`, background: monthColor }} />
                      </div>
                      <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 8 }}>
                        {deliveredCount >= targetCount
                          ? "🎉 Monthly target met — great month!"
                          : `${targetCount - deliveredCount} more deliveries to hit this month's target`}
                        {monthTarget?.note ? ` · ${monthTarget.note}` : ""}
                      </p>
                    </>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="card" style={{ overflow: "hidden" }}>
                    <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)" }}>
                      <p className="section-title">Delivered by department</p>
                    </div>
                    {deliveredInMonth.length === 0 ? (
                      <div className="empty" style={{ padding: 34 }}><p>Nothing delivered this month yet</p></div>
                    ) : (
                      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
                        {Array.from(monthByDept.entries()).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
                          const share = Math.round((count / deliveredInMonth.length) * 100);
                          return (
                            <div key={label}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
                                <span style={{ fontSize: 12.5, color: "var(--tx-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getCategoryEmoji(label)} {label}</span>
                                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--tx-primary)", flexShrink: 0 }}>{count}</span>
                              </div>
                              <div className="dept-bar-track"><div className="dept-bar-fill" style={{ width: `${share}%`, background: CATEGORY_COLORS[label] || "#7c3aed" }} /></div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="card" style={{ overflow: "hidden" }}>
                    <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)" }}>
                      <p className="section-title">Monthly history</p>
                    </div>
                    {targets.length === 0 ? (
                      <div className="empty" style={{ padding: 34 }}><p>No monthly targets set yet</p></div>
                    ) : targets.map((t) => {
                      const delivered = deliveredIn(t.year, t.month).length;
                      const pct = t.target > 0 ? Math.min(100, Math.round((delivered / t.target) * 100)) : 0;
                      const col = pct >= 100 ? "var(--green)" : pct >= 60 ? "var(--amber)" : "var(--red)";
                      return (
                        <div key={t.id} onClick={() => { setSelYear(t.year); setSelMonth(t.month); }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                          <span className="dot" style={{ background: col }} />
                          <span style={{ flex: 1, fontSize: 13, color: "var(--tx-primary)" }}>{MONTHS[t.month - 1]} {t.year}</span>
                          <div className="mini-progress-track"><div className="mini-progress-fill" style={{ width: `${pct}%`, background: col }} /></div>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--tx-primary)", minWidth: 44, textAlign: "right" }}>{delivered}/{t.target}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Invoices view ──────────────────────────────────── */}
            {view === "invoices" && (
              <div className="card tab-fade" style={{ overflow: "hidden" }}>
                <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
                  <p className="section-title">Invoices</p>
                  <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 2 }}>Click any invoice to view and download it as a PDF</p>
                </div>

                {invoices.length === 0 ? (
                  <div className="empty" style={{ padding: 60 }}>
                    <p style={{ fontSize: 24, marginBottom: 8 }}>🧾</p>
                    <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>No invoices yet</p>
                    <p style={{ fontSize: 13 }}>Invoices raised for your account will appear here</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr><th>Invoice</th><th>Invoice date</th><th>Period</th><th>Amount</th><th>Status</th><th></th></tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => {
                          const { total } = invoiceTotals(inv.items, inv.taxPercent);
                          return (
                            <tr key={inv.id} onClick={() => window.open(`/invoice/${inv.id}`, "_blank")} title="Open invoice">
                              <td style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-primary)" }}>{inv.number}</td>
                              <td style={{ fontSize: 12.5, color: "var(--tx-secondary)" }}>{formatDate(inv.issueDate)}</td>
                              <td style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>
                                {inv.periodMonth && inv.periodYear ? `${MONTHS[inv.periodMonth - 1]} ${inv.periodYear}` : "—"}
                              </td>
                              <td style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-primary)" }}>{money(total, inv.currency)}</td>
                              <td><span className={`badge ${INVOICE_STATUS_BADGE[inv.status] || "badge-gray"}`}>{INVOICE_STATUS_LABEL[inv.status] || inv.status}</span></td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <a href={`/invoice/${inv.id}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>View PDF</a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Upcoming / recent ──────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="card anim-up" style={{ overflow: "hidden" }}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)" }}><p className="section-title">Coming up</p></div>
                {upcoming.length === 0 ? (
                  <div className="empty" style={{ padding: 30 }}><p>Nothing outstanding 🎉</p></div>
                ) : upcoming.map((t) => {
                  const od = isOverdue(t);
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: "1px solid var(--border)" }}>
                      <span className="dot" style={{ background: od ? "var(--red)" : "var(--accent)" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                        <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{t.category || "Uncategorized"}</p>
                      </div>
                      <span style={{ fontSize: 11.5, color: od ? "var(--red)" : "var(--tx-tertiary)", flexShrink: 0, fontWeight: 500 }}>{dueLabel(t.endDate)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="card anim-up" style={{ overflow: "hidden" }}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)" }}><p className="section-title">Recently delivered</p></div>
                {recent.length === 0 ? (
                  <div className="empty" style={{ padding: 30 }}><p>Nothing delivered yet</p></div>
                ) : recent.map((t) => (
                  <div key={t.id} className="activity-row" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="activity-icon">✅</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, color: "var(--tx-primary)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                      <p style={{ fontSize: 11, color: "var(--tx-tertiary)", marginTop: 2 }}>{t.category || "Uncategorized"} · {timeAgo(t.completedAt!)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Promo ribbon ──────────────────────────────────── */}
            <div className="promo-ribbon anim-up">
              <div className="item"><span className="ico">📋</span><span className="txt"><p className="t">Full Transparency</p><p className="s">Every deliverable, tracked live</p></span></div>
              <div className="item"><span className="ico">🎯</span><span className="txt"><p className="t">Monthly Targets</p><p className="s">See exactly what was agreed</p></span></div>
              <div className="item"><span className="ico">🧾</span><span className="txt"><p className="t">Clear Invoicing</p><p className="s">Download any invoice as PDF</p></span></div>
              <div className="item"><span className="ico">🚀</span><span className="txt"><p className="t">Growing Together</p><p className="s">Powered by GrowthZee CRM</p></span></div>
            </div>
          </div>

          {/* ── Right rail ────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="rail-card anim-up">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p className="section-title">This month</p>
                <span style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{MONTHS[now.getMonth()]}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: "var(--accent)", letterSpacing: "-0.02em" }}>{curDelivered}</span>
                <span style={{ fontSize: 13, color: "var(--tx-tertiary)" }}>{curTarget > 0 ? `of ${curTarget} delivered` : "delivered"}</span>
              </div>
              {curTarget > 0 && (
                <>
                  <div className="progress-track" style={{ height: 7 }}>
                    <div className="progress-fill" style={{ width: `${curPct}%`, background: curPct >= 100 ? "var(--green)" : curPct >= 60 ? "var(--amber)" : "var(--red)" }} />
                  </div>
                  <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 7 }}>
                    {curDelivered >= curTarget ? "Target met for this month 🎉" : `${curTarget - curDelivered} to go this month`}
                  </p>
                </>
              )}
              {curTarget === 0 && (
                <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>No target set for this month.</p>
              )}
            </div>

            <div className="rail-card anim-up">
              <p className="section-title" style={{ marginBottom: 12 }}>Work summary</p>
              {([
                ["Delivered", done, "var(--green)"],
                ["In progress", active, "var(--blue)"],
                ["Pending", pending, "var(--amber)"],
                ["Changes needed", changes, "var(--amber)"],
                ["Overdue", overdue, "var(--red)"],
              ] as [string, number, string][]).map(([label, val, color]) => (
                <div key={label} className="rail-stat-row">
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--tx-secondary)" }}>
                    <span className="dot" style={{ background: color }} />{label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-primary)" }}>{val}</span>
                </div>
              ))}
            </div>

            <div className="rail-card anim-up">
              <p className="section-title" style={{ marginBottom: 12 }}>Billing</p>
              {([
                ["Invoices raised", invoices.length, "var(--tx-primary)"],
                ["Paid", invoices.filter((i) => i.status === "PAID").length, "var(--green)"],
                ["Awaiting payment", invoices.filter((i) => i.status === "RAISED").length, "var(--amber)"],
              ] as [string, number, string][]).map(([label, val, color]) => (
                <div key={label} className="rail-stat-row">
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--tx-secondary)" }}>
                    <span className="dot" style={{ background: color }} />{label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-primary)" }}>{val}</span>
                </div>
              ))}
              {unpaidTotal > 0 && (
                <div style={{ marginTop: 10, padding: "11px 12px", background: "var(--amber-bg)", borderRadius: "var(--r-md)" }}>
                  <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginBottom: 2 }}>Outstanding</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: "var(--amber)" }}>{money(unpaidTotal, invoices[0]?.currency || "INR")}</p>
                </div>
              )}
              {invoices.length > 0 && (
                <button className="rail-action-btn" style={{ marginTop: 10, marginBottom: 0 }} onClick={() => setView("invoices")}>
                  <span className="rail-action-icon" style={{ background: "var(--purple-bg)" }}>🧾</span>View all invoices
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
