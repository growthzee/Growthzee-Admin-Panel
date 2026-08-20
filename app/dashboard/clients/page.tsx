"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

type ClientTask = {
  id: string; title: string; status: string; category?: string | null;
  startDate: string; endDate: string; createdAt: string; completedAt?: string | null;
};
type Client = {
  id: string; name: string; email: string; phone?: string; company?: string;
  website?: string; notes?: string; status: string; createdAt: string;
  portalEnabled: boolean; clientTasks: ClientTask[];
};

const CLI_S = ["ACTIVE", "INACTIVE", "PROSPECT"];
const S_BADGE: Record<string, string> = { ACTIVE: "badge-green", INACTIVE: "badge-red", PROSPECT: "badge-amber" };
const S_LABEL: Record<string, string> = { ACTIVE: "Active", INACTIVE: "Inactive", PROSPECT: "Prospect" };
const PAGE_SIZE = 8;
const BUCKET_COLORS: Record<string, string> = {
  Completed: "var(--green)", "On Track": "var(--blue)", "At Risk": "var(--amber)", Delayed: "var(--red)",
};

function isOverdue(t: ClientTask, now: Date) {
  return t.status !== "COMPLETED" && new Date(t.endDate) < now;
}

function clientMetrics(c: Client, now: Date) {
  const total = c.clientTasks.length;
  const done = c.clientTasks.filter(t => t.status === "COMPLETED").length;
  const overdueCount = c.clientTasks.filter(t => isOverdue(t, now)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  let bucket: "Completed" | "On Track" | "At Risk" | "Delayed";
  if (total === 0) bucket = "On Track";
  else if (pct === 100) bucket = "Completed";
  else if (overdueCount > 0) bucket = "Delayed";
  else if (pct < 50) bucket = "At Risk";
  else bucket = "On Track";
  const nextTask = c.clientTasks
    .filter(t => t.status !== "COMPLETED")
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())[0];
  return { total, done, overdueCount, pct, bucket, nextTask };
}

function timeAgo(date: Date | string, now: Date): string {
  const diffMs = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function dueLabel(date: Date | string, now: Date): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date);
  const diffDays = Math.round((new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime() - start.getTime()) / 86400000);
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays === -1) return "1 day overdue";
  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
  return `In ${diffDays} days`;
}

function Modal({ client, onClose, onSave }: { client?: Client | null; onClose: () => void; onSave: () => void }) {
  const [f, setF] = useState({ name: client?.name || "", email: client?.email || "", phone: client?.phone || "", company: client?.company || "", website: client?.website || "", notes: client?.notes || "", status: client?.status || "ACTIVE" });
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try { const res = await fetch(client ? `/api/clients/${client.id}` : "/api/clients", { method: client ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }); const d = await res.json(); if (!res.ok) throw new Error(d.error || "Failed"); onSave(); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }
  return (
    <div className="modal-backdrop anim-in">
      <div className="modal anim-scale">
        <div className="modal-header">
          <p className="section-title">{client ? "Edit client" : "Add client"}</p>
          <button className="btn-ghost btn-icon" onClick={onClose}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>
        <div className="modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {error && <div style={{ padding: "8px 12px", background: "var(--red-bg)", borderRadius: "var(--r-md)", color: "var(--red)", fontSize: 13, marginBottom: 14 }}>{error}</div>}
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[{ k: "name", l: "Name", req: true }, { k: "email", l: "Email", req: true, type: "email" }, { k: "phone", l: "Phone" }, { k: "company", l: "Company" }, { k: "website", l: "Website" }].map(({ k, l, req, type }) => (
              <div key={k}><label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--tx-secondary)", marginBottom: 5 }}>{l}{req ? " *" : ""}</label><input className="input" required={req} type={type || "text"} value={f[k as keyof typeof f]} onChange={e => setF({ ...f, [k]: e.target.value })} placeholder={l} /></div>
            ))}
            <div><label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--tx-secondary)", marginBottom: 5 }}>Status</label><select className="input" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>{CLI_S.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--tx-secondary)", marginBottom: 5 }}>Notes</label><textarea className="input" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} rows={2} style={{ minHeight: 60 }} /></div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>{loading && <span className="spinner" style={{ width: 13, height: 13, borderTopColor: "rgba(255,255,255,0.7)" }} />}{loading ? "Saving…" : client ? "Save" : "Add client"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function WeeklyChart({ clients }: { clients: Client[] }) {
  const now = new Date();
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = new Date(day.getTime() + 86400000);
    let count = 0;
    for (const c of clients) for (const t of c.clientTasks) {
      if (t.completedAt) {
        const cd = new Date(t.completedAt);
        if (cd >= day && cd < next) count++;
      }
    }
    days.push({ label: day.toLocaleDateString("en-US", { weekday: "short" }), count });
  }
  const max = Math.max(1, ...days.map(d => d.count));
  const w = 100 / (days.length - 1);
  const points = days.map((d, i) => `${i * w},${40 - (d.count / max) * 36}`).join(" ");
  return (
    <div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: "100%", height: 88, display: "block" }}>
        <polyline points={`0,40 ${points} 100,40`} fill="url(#chartFill)" stroke="none" />
        <polyline points={points} fill="none" stroke="#7c3aed" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {days.map((d, i) => (
          <span key={i} style={{ fontSize: 10.5, color: "var(--tx-tertiary)" }}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Client | null>(null);
  const now = useMemo(() => new Date(), []);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clients`);
    const d = await res.json();
    setClients(Array.isArray(d) ? d : []);
    setLoading(false);
  }, []);
  useEffect(() => { fetchClients(); }, [fetchClients]);
  async function deleteClient(id: string) { await fetch(`/api/clients/${id}`, { method: "DELETE" }); fetchClients(); }

  // ── Derived metrics (all real, computed client-side) ──────────────
  const withMetrics = useMemo(() => clients.map(c => ({ c, m: clientMetrics(c, now) })), [clients, now]);
  const allTasks = useMemo(() => clients.flatMap(c => c.clientTasks), [clients]);
  const completedTasks = allTasks.filter(t => t.status === "COMPLETED").length;
  const pendingTasks = allTasks.filter(t => t.status === "PENDING").length;
  const overdueTasksCount = allTasks.filter(t => isOverdue(t, now)).length;
  const ratedClients = withMetrics.filter(({ m }) => m.total > 0);
  const avgProgress = ratedClients.length > 0 ? Math.round(ratedClients.reduce((s, { m }) => s + m.pct, 0) / ratedClients.length) : 0;

  const bucketCounts = { Completed: 0, "On Track": 0, "At Risk": 0, Delayed: 0 };
  for (const { m } of withMetrics) bucketCounts[m.bucket]++;
  const bucketTotal = Math.max(1, clients.length);

  // Category progress (from clientTasks.category)
  const catMap = new Map<string, { done: number; total: number }>();
  for (const t of allTasks) {
    const key = t.category || "Uncategorized";
    const cur = catMap.get(key) || { done: 0, total: 0 };
    cur.total++; if (t.status === "COMPLETED") cur.done++;
    catMap.set(key, cur);
  }
  const catRows = Array.from(catMap.entries())
    .map(([name, v]) => ({ name, pct: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0, total: v.total }))
    .sort((a, b) => b.total - a.total).slice(0, 5);
  const CAT_COLORS = ["#7c3aed", "#2383E2", "#0F9D58", "#D97706", "#db2777"];

  // Upcoming deadlines
  const upcoming = withMetrics
    .filter(({ m }) => m.nextTask)
    .map(({ c, m }) => ({ clientName: c.name, title: m.nextTask!.title, endDate: m.nextTask!.endDate, overdue: isOverdue(m.nextTask!, now) }))
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    .slice(0, 5);

  // Recent activity
  const activity = [
    ...clients.map(c => ({ id: `c-${c.id}`, icon: "🤝", text: `New client added — ${c.name}`, at: c.createdAt })),
    ...allTasks.filter(t => t.completedAt).map(t => ({ id: `t-${t.id}`, icon: "✅", text: `Task completed — ${t.title}`, at: t.completedAt! })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6);

  // Today's summary (right rail)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000 - 1);
  const todayTasks = allTasks.filter(t => new Date(t.endDate) >= startOfToday && new Date(t.endDate) <= endOfToday);

  // ── Table: search + filter + pagination (all client-side = always works) ──
  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withMetrics.filter(({ c, m }) => {
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q);
      const matchesFilter = filter === "All" || m.bucket === filter;
      return matchesSearch && matchesFilter;
    });
  }, [withMetrics, search, filter]);
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const pageClients = filteredClients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, filter]);

  const STAT_CARDS = [
    { label: "Total Clients", val: clients.length, sub: `${clients.filter(c => c.status === "ACTIVE").length} active`, bg: "var(--purple-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.77-.77-.77a5.4 5.4 0 1 0-7.65 7.65l.77.77L12 20.66l7.65-7.66.77-.77a5.4 5.4 0 0 0 0-7.65z" /></svg> },
    { label: "Completed Tasks", val: completedTasks, sub: `of ${allTasks.length} total`, bg: "var(--green-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F9D58" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
    { label: "Pending Tasks", val: pendingTasks, sub: "awaiting start", bg: "var(--amber-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { label: "Overdue Tasks", val: overdueTasksCount, sub: "need attention", bg: "var(--red-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
    { label: "Avg. Progress", val: `${avgProgress}%`, sub: "across all clients", bg: "var(--blue-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2383E2" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> },
  ];

  const donutSegs = (["Completed", "On Track", "At Risk", "Delayed"] as const).map(k => ({ key: k, count: bucketCounts[k], pct: bucketCounts[k] / bucketTotal }));
  let acc = 0;
  const gradientParts = donutSegs.map(s => {
    const start = acc * 360; acc += s.pct; const end = acc * 360;
    return `${BUCKET_COLORS[s.key]} ${start}deg ${end}deg`;
  }).join(", ");

  return (
    <div className="wide-section">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }} className="anim-up">
        <div>
          <h1 className="page-title" style={{ fontSize: 24 }}>Clients</h1>
          <p style={{ fontSize: 13.5, color: "var(--tx-tertiary)", marginTop: 5 }}>{clients.length} clients · {allTasks.length} tasks tracked</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelected(null); setModal("add"); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add New Client
        </button>
      </div>

      {loading ? (
        <div className="empty" style={{ padding: 100 }}><div className="spinner" /></div>
      ) : (
        <div className="rail-grid">
          {/* ── Main column ─────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
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

            {/* Progress overview / weekly chart / category progress */}
            <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1fr 1fr", gap: 16 }}>
              <div className="card anim-up d2" style={{ padding: "14px 16px" }}>
                <p className="section-title" style={{ marginBottom: 10 }}>Client Progress</p>
                <div className="donut-wrap" style={{ width: 120, height: 120, margin: "6px auto 14px" }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: clients.length ? `conic-gradient(${gradientParts})` : "var(--hover-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "70%", height: "70%", borderRadius: "50%", background: "var(--card-bg)" }} />
                  </div>
                  <div className="donut-center">
                    <span className="pct" style={{ fontSize: 20 }}>{clients.length}</span>
                    <span className="lbl">Clients</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {donutSegs.map(s => (
                    <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span className="dot" style={{ background: BUCKET_COLORS[s.key] }} />
                      <span style={{ fontSize: 12, color: "var(--tx-secondary)", flex: 1 }}>{s.key}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-primary)" }}>{bucketCounts[s.key]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card anim-up d3" style={{ padding: "14px 16px" }}>
                <p className="section-title" style={{ marginBottom: 10 }}>Tasks Completed (7 days)</p>
                <WeeklyChart clients={clients} />
              </div>

              <div className="card anim-up d4" style={{ padding: "14px 16px" }}>
                <p className="section-title" style={{ marginBottom: 12 }}>Category Progress</p>
                {catRows.length === 0 ? (
                  <div className="empty" style={{ padding: 20 }}><p>No task data yet</p></div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {catRows.map((row, i) => (
                      <div key={row.name}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "var(--tx-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>{row.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-primary)" }}>{row.pct}%</span>
                        </div>
                        <div className="dept-bar-track"><div className="dept-bar-fill" style={{ width: `${row.pct}%`, background: CAT_COLORS[i % CAT_COLORS.length] }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* All Clients table */}
            <div className="card anim-up" style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <p className="section-title" style={{ marginRight: "auto" }}>All Clients ({filteredClients.length})</p>
                <div className="filter-tabs-wrap">
                  {["All", "On Track", "At Risk", "Delayed", "Completed"].map(f => (
                    <button key={f} className={`filter-tab${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
                  ))}
                </div>
                <div className="search-wrap" style={{ maxWidth: 220 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" />
                </div>
              </div>

              {filteredClients.length === 0 ? (
                <div className="empty" style={{ padding: 60 }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>🤝</p>
                  <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>{clients.length === 0 ? "No clients yet" : "No clients match your search"}</p>
                  <p style={{ fontSize: 13 }}>{clients.length === 0 ? "Add your first client to get started" : "Try a different search term or filter"}</p>
                </div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Client</th><th>Progress</th><th>Status</th><th>Health</th><th>Next task</th><th>Deadline</th><th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageClients.map(({ c, m }) => (
                          <tr key={c.id} onClick={() => window.location.assign(`/dashboard/clients/${c.id}`)}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <div className="avatar">{c.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</div>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{c.name}</p>
                                  <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{c.company || c.email}</p>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div className="mini-progress-track"><div className="mini-progress-fill" style={{ width: `${m.pct}%`, background: m.pct >= 65 ? "var(--green)" : m.pct >= 35 ? "var(--amber)" : "var(--red)" }} /></div>
                                <span style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>{m.pct}%</span>
                              </div>
                            </td>
                            <td><span className={`badge ${S_BADGE[c.status] || "badge-gray"}`}>{S_LABEL[c.status] || c.status}</span></td>
                            <td><span className="health-badge" style={{ background: `color-mix(in srgb, ${BUCKET_COLORS[m.bucket]} 16%, transparent)`, color: BUCKET_COLORS[m.bucket] }}>{m.bucket}</span></td>
                            <td style={{ fontSize: 12.5, color: "var(--tx-secondary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nextTask ? m.nextTask.title : "—"}</td>
                            <td style={{ fontSize: 12.5, color: m.nextTask && isOverdue(m.nextTask, now) ? "var(--red)" : "var(--tx-tertiary)" }}>{m.nextTask ? formatDate(m.nextTask.endDate) : "—"}</td>
                            <td onClick={e => e.stopPropagation()}>
                              <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                                <button className="btn-ghost btn-icon" onClick={() => { setSelected(c); setModal("edit"); }} title="Edit">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </button>
                                <button className="btn-ghost btn-icon" onClick={() => deleteClient(c.id)} title="Delete">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="pager">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button key={p} className={p === page ? "active" : ""} onClick={() => setPage(p)}>{p}</button>
                      ))}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Upcoming deadlines / Recent activity */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="card anim-up" style={{ overflow: "hidden" }}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)" }}><p className="section-title">Upcoming Deadlines</p></div>
                {upcoming.length === 0 ? (
                  <div className="empty" style={{ padding: 30 }}><p>Nothing upcoming</p></div>
                ) : upcoming.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: "1px solid var(--border)" }}>
                    <span className="dot" style={{ background: t.overdue ? "var(--red)" : "var(--accent)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                      <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{t.clientName}</p>
                    </div>
                    <span style={{ fontSize: 11.5, color: t.overdue ? "var(--red)" : "var(--tx-tertiary)", flexShrink: 0, fontWeight: 500 }}>{dueLabel(t.endDate, now)}</span>
                  </div>
                ))}
              </div>

              <div className="card anim-up" style={{ overflow: "hidden" }}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)" }}><p className="section-title">Recent Activity</p></div>
                {activity.length === 0 ? (
                  <div className="empty" style={{ padding: 30 }}><p>No recent activity</p></div>
                ) : activity.map(a => (
                  <div key={a.id} className="activity-row" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="activity-icon">{a.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, color: "var(--tx-primary)", lineHeight: 1.4 }}>{a.text}</p>
                      <p style={{ fontSize: 11, color: "var(--tx-tertiary)", marginTop: 2 }}>{timeAgo(a.at, now)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Promo ribbon */}
            <div className="promo-ribbon anim-up">
              <div className="item"><span className="ico">📍</span><span className="txt"><p className="t">Everything in One Place</p><p className="s">Track all client work in real time</p></span></div>
              <div className="item"><span className="ico">⚙️</span><span className="txt"><p className="t">Automated Workflows</p><p className="s">Save time, stay on track</p></span></div>
              <div className="item"><span className="ico">📈</span><span className="txt"><p className="t">Data-Driven Decisions</p><p className="s">Make better business moves</p></span></div>
              <div className="item"><span className="ico">🚀</span><span className="txt"><p className="t">Deliver More, Stress Less</p><p className="s">Built for growing teams</p></span></div>
            </div>
          </div>

          {/* ── Right rail ──────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="rail-card anim-up">
              <p className="section-title" style={{ marginBottom: 12 }}>Today&apos;s Summary</p>
              {[
                ["Due today", todayTasks.length, "var(--tx-primary)"],
                ["Completed", todayTasks.filter(t => t.status === "COMPLETED").length, "var(--green)"],
                ["In progress", todayTasks.filter(t => t.status === "IN_PROGRESS").length, "var(--blue)"],
                ["Pending", todayTasks.filter(t => t.status === "PENDING").length, "var(--amber)"],
                ["Overdue", overdueTasksCount, "var(--red)"],
              ].map(([label, val, color]) => (
                <div key={label as string} className="rail-stat-row">
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--tx-secondary)" }}>
                    <span className="dot" style={{ background: color as string }} />{label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-primary)" }}>{val as number}</span>
                </div>
              ))}
            </div>

            <div className="rail-card anim-up">
              <p className="section-title" style={{ marginBottom: 12 }}>Quick Actions</p>
              <button className="rail-action-btn" onClick={() => { setSelected(null); setModal("add"); }}>
                <span className="rail-action-icon" style={{ background: "var(--purple-bg)" }}>🤝</span>New Client
              </button>
              <Link href="/dashboard/tasks" className="rail-action-btn">
                <span className="rail-action-icon" style={{ background: "var(--blue-bg)" }}>✅</span>View All Tasks
              </Link>
              <Link href="/dashboard/performance" className="rail-action-btn">
                <span className="rail-action-icon" style={{ background: "var(--green-bg)" }}>📊</span>View Reports
              </Link>
              <button className="rail-action-btn" onClick={fetchClients} style={{ marginBottom: 0 }}>
                <span className="rail-action-icon" style={{ background: "var(--amber-bg)" }}>🔄</span>Refresh Data
              </button>
            </div>
          </div>
        </div>
      )}

      {(modal === "add" || modal === "edit") && <Modal client={modal === "edit" ? selected : null} onClose={() => setModal(null)} onSave={fetchClients} />}
    </div>
  );
}
