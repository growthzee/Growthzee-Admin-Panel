"use client";
import { Fragment, useState, useEffect, useMemo } from "react";
import Link from "next/link";

type CT = { status: string; title: string; completedAt?: string; client: { name: string; company?: string } };
type Stat = {
  id: string; name: string; email: string; department: string; position: string; status: string;
  internal: { total: number; completed: number };
  client: { total: number; completed: number; failed: number; changes: number; pending: number };
  clientTasks: CT[];
};

const S_BADGE: Record<string, string> = { COMPLETED: "badge-green", PENDING: "badge-gray", IN_PROGRESS: "badge-blue", CHANGES_REQUIRED: "badge-amber", OVERDUE: "badge-red" };
const S_LABEL: Record<string, string> = { COMPLETED: "Done", PENDING: "Pending", IN_PROGRESS: "Active", CHANGES_REQUIRED: "Changes", OVERDUE: "Overdue" };
const DEPT_COLORS: Record<string, string> = { Engineering: "#7c3aed", Design: "#ec4899", Marketing: "#2383E2", Sales: "#0F9D58", HR: "#D97706", Finance: "#0891b2", Operations: "#db2777" };
const PAGE_SIZE = 8;

type Scope = "client" | "internal" | "all";

/** Per-employee numbers for the selected scope */
function scopedFor(e: Stat, scope: Scope) {
  if (scope === "client") {
    return { total: e.client.total, completed: e.client.completed, changes: e.client.changes, failed: e.client.failed, pending: e.client.pending };
  }
  if (scope === "internal") {
    return { total: e.internal.total, completed: e.internal.completed, changes: 0, failed: 0, pending: Math.max(0, e.internal.total - e.internal.completed) };
  }
  return {
    total: e.client.total + e.internal.total,
    completed: e.client.completed + e.internal.completed,
    changes: e.client.changes,
    failed: e.client.failed,
    pending: e.client.pending + Math.max(0, e.internal.total - e.internal.completed),
  };
}
function rateOf(n: { total: number; completed: number }) {
  return n.total > 0 ? Math.round((n.completed / n.total) * 100) : 0;
}
function rateColor(rate: number) {
  return rate >= 80 ? "var(--green)" : rate >= 50 ? "var(--amber)" : "var(--red)";
}
function initials(name: string) {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function Donut({ segments, centerValue, centerLabel, size = 120 }: {
  segments: { label: string; count: number; color: string }[];
  centerValue: number | string;
  centerLabel: string;
  size?: number;
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

/** 7-day completion trend, built from client task completedAt timestamps */
function WeeklyChart({ stats }: { stats: Stat[] }) {
  const now = new Date();
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = new Date(day.getTime() + 86400000);
    let count = 0;
    for (const e of stats) for (const t of e.clientTasks) {
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
        <polyline points={`0,40 ${points} 100,40`} fill="url(#perfChartFill)" stroke="none" />
        <polyline points={points} fill="none" stroke="#7c3aed" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="perfChartFill" x1="0" y1="0" x2="0" y2="1">
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

export default function PerformancePage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("client");
  const [sort, setSort] = useState<"rate" | "assigned" | "name">("assigned");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/employees/stats")
      .then((r) => r.json())
      .then((d) => { setStats(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const withNums = useMemo(
    () => stats.map((e) => { const n = scopedFor(e, scope); return { e, n, rate: rateOf(n) }; }),
    [stats, scope],
  );

  const totals = withNums.reduce(
    (acc, { n }) => ({
      total: acc.total + n.total,
      completed: acc.completed + n.completed,
      changes: acc.changes + n.changes,
      failed: acc.failed + n.failed,
      pending: acc.pending + n.pending,
    }),
    { total: 0, completed: 0, changes: 0, failed: 0, pending: 0 },
  );
  const overallRate = totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;
  const rated = withNums.filter(({ n }) => n.total > 0);
  const avgRate = rated.length > 0 ? Math.round(rated.reduce((s, r) => s + r.rate, 0) / rated.length) : 0;

  // Department performance
  const deptMap = new Map<string, { done: number; total: number }>();
  for (const { e, n } of withNums) {
    const cur = deptMap.get(e.department) || { done: 0, total: 0 };
    cur.done += n.completed; cur.total += n.total;
    deptMap.set(e.department, cur);
  }
  const deptRows = Array.from(deptMap.entries())
    .filter(([, v]) => v.total > 0)
    .map(([name, v]) => ({ name, pct: Math.round((v.done / v.total) * 100), total: v.total }))
    .sort((a, b) => b.total - a.total).slice(0, 6);

  // Leaderboards — only employees who actually have work assigned
  const topPerformers = [...rated].sort((a, b) => b.rate - a.rate || b.n.total - a.n.total).slice(0, 5);
  const needsAttention = [...rated].sort((a, b) => a.rate - b.rate || b.n.total - a.n.total).slice(0, 5);

  // Table
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = withNums.filter(({ e }) =>
      !q || e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q) || e.position.toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      if (sort === "name") return a.e.name.localeCompare(b.e.name);
      if (sort === "rate") return b.rate - a.rate || b.n.total - a.n.total;
      return b.n.total - a.n.total || b.rate - a.rate;
    });
  }, [withNums, search, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); setExpanded(null); }, [search, sort, scope]);

  const scopeLabel = scope === "client" ? "client tasks" : scope === "internal" ? "internal tasks" : "all tasks";

  const STAT_CARDS = [
    { label: "Assigned", val: totals.total, sub: scopeLabel, bg: "var(--purple-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" /></svg> },
    { label: "Completed", val: totals.completed, sub: `${overallRate}% of assigned`, bg: "var(--green-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F9D58" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
    { label: "Pending", val: totals.pending, sub: "still open", bg: "var(--blue-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2383E2" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { label: "Changes", val: totals.changes, sub: "rework requested", bg: "var(--amber-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg> },
    { label: "Failed", val: totals.failed, sub: "marked overdue", bg: "var(--red-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
    { label: "Avg. Rate", val: `${avgRate}%`, sub: "per employee", bg: "var(--purple-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> },
  ];

  const segments = [
    { label: "Completed", count: totals.completed, color: "var(--green)" },
    { label: "Pending", count: totals.pending, color: "var(--blue)" },
    { label: "Changes", count: totals.changes, color: "var(--amber)" },
    { label: "Failed", count: totals.failed, color: "var(--red)" },
  ];

  return (
    <div className="wide-section">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }} className="anim-up">
        <div>
          <h1 className="page-title" style={{ fontSize: 24 }}>Performance</h1>
          <p style={{ fontSize: 13.5, color: "var(--tx-tertiary)", marginTop: 5 }}>
            Task completion across {stats.length} team member{stats.length === 1 ? "" : "s"} · showing {scopeLabel}
          </p>
        </div>
        <div className="filter-tabs-wrap">
          {([["client", "Client"], ["internal", "Internal"], ["all", "Combined"]] as const).map(([k, l]) => (
            <button key={k} className={`filter-tab${scope === k ? " active" : ""}`} onClick={() => setScope(k)}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty" style={{ padding: 100 }}><div className="spinner" /></div>
      ) : (
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

            {/* ── Outcome donut / trend / department bars ─────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1fr 1fr", gap: 16 }}>
              <div className="card anim-up d2" style={{ padding: "14px 16px" }}>
                <p className="section-title" style={{ marginBottom: 10 }}>Task Outcomes</p>
                <Donut segments={segments} centerValue={`${overallRate}%`} centerLabel="Completed" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {segments.map((s) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span className="dot" style={{ background: s.color }} />
                      <span style={{ fontSize: 12, color: "var(--tx-secondary)", flex: 1 }}>{s.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-primary)" }}>
                        {s.count}
                        <span style={{ fontWeight: 400, color: "var(--tx-tertiary)" }}>
                          {" "}({totals.total > 0 ? Math.round((s.count / totals.total) * 100) : 0}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card anim-up d3" style={{ padding: "14px 16px" }}>
                <p className="section-title" style={{ marginBottom: 2 }}>Completed (7 days)</p>
                <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginBottom: 8 }}>Client tasks with a completion date</p>
                <WeeklyChart stats={stats} />
              </div>

              <div className="card anim-up d4" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p className="section-title">Department Performance</p>
                  <span style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>{deptRows.length} depts</span>
                </div>
                {deptRows.length === 0 ? (
                  <div className="empty" style={{ padding: 20 }}><p>No task data yet</p></div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {deptRows.map((row) => (
                      <div key={row.name}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "var(--tx-secondary)" }}>{row.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-primary)" }}>{row.pct}%</span>
                        </div>
                        <div className="dept-bar-track">
                          <div className="dept-bar-fill" style={{ width: `${row.pct}%`, background: DEPT_COLORS[row.name] || "#7c3aed" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Employee performance table ──────────────────────── */}
            <div className="card anim-up" style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <p className="section-title" style={{ marginRight: "auto" }}>Employee Performance ({filtered.length})</p>
                <div className="filter-tabs-wrap">
                  {([["assigned", "Most assigned"], ["rate", "Best rate"], ["name", "A–Z"]] as const).map(([k, l]) => (
                    <button key={k} className={`filter-tab${sort === k ? " active" : ""}`} onClick={() => setSort(k)}>{l}</button>
                  ))}
                </div>
                <div className="search-wrap" style={{ maxWidth: 200 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees…" />
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="empty" style={{ padding: 60 }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>📊</p>
                  <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>{stats.length === 0 ? "No performance data yet" : "No employees match your search"}</p>
                  <p style={{ fontSize: 13 }}>{stats.length === 0 ? "Assign tasks to start tracking completion" : "Try a different name or department"}</p>
                </div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr><th>Employee</th><th>Department</th><th>Assigned</th><th>Done</th><th>Changes</th><th>Failed</th><th>Completion rate</th><th></th></tr>
                      </thead>
                      <tbody>
                        {pageRows.map(({ e: emp, n, rate }) => {
                          const isExp = expanded === emp.id;
                          const rc = rateColor(rate);
                          return (
                            <Fragment key={emp.id}>
                              <tr onClick={() => n.total > 0 && setExpanded(isExp ? null : emp.id)} title={n.total > 0 ? "Show task breakdown" : undefined}>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div className="avatar">{initials(emp.name)}</div>
                                    <div style={{ minWidth: 0 }} onClick={(ev) => ev.stopPropagation()}>
                                      <Link href={`/dashboard/employees/${emp.id}`} style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-primary)", textDecoration: "none" }}>
                                        {emp.name}
                                      </Link>
                                      <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{emp.position}</p>
                                    </div>
                                  </div>
                                </td>
                                <td><span className="badge badge-purple">{emp.department}</span></td>
                                <td style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-primary)" }}>{n.total}</td>
                                <td><span className="badge badge-green">{n.completed}</span></td>
                                <td>{n.changes > 0 ? <span className="badge badge-amber">{n.changes}</span> : <span style={{ fontSize: 12, color: "var(--tx-disabled)" }}>—</span>}</td>
                                <td>{n.failed > 0 ? <span className="badge badge-red">{n.failed}</span> : <span style={{ fontSize: 12, color: "var(--tx-disabled)" }}>—</span>}</td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div className="mini-progress-track">
                                      <div className="mini-progress-fill" style={{ width: `${rate}%`, background: rc }} />
                                    </div>
                                    <span style={{ fontSize: 12.5, fontWeight: 600, color: rc, minWidth: 32 }}>{rate}%</span>
                                  </div>
                                </td>
                                <td>
                                  {n.total > 0 && (
                                    <button className="btn-ghost btn-icon" onClick={(ev) => { ev.stopPropagation(); setExpanded(isExp ? null : emp.id); }} title="Task breakdown">
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isExp ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                                        <polyline points="6 9 12 15 18 9" />
                                      </svg>
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {isExp && (
                                <tr>
                                  <td colSpan={8} style={{ background: "var(--hover-bg)", padding: "12px 16px 14px 56px" }}>
                                    <p className="label-text" style={{ marginBottom: 8 }}>Client task breakdown</p>
                                    {emp.clientTasks.length === 0 ? (
                                      <p style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>No client tasks assigned — this employee only has internal tasks.</p>
                                    ) : (
                                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        {emp.clientTasks.map((ct, i) => (
                                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", background: "var(--card-bg)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
                                            <span className={`badge ${S_BADGE[ct.status] || "badge-gray"}`}>{S_LABEL[ct.status] || ct.status}</span>
                                            <span style={{ fontSize: 12.5, color: "var(--tx-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ct.title}</span>
                                            <span style={{ fontSize: 11.5, color: "var(--tx-tertiary)", flexShrink: 0 }}>{ct.client.company || ct.client.name}</span>
                                            {ct.completedAt && (
                                              <span style={{ fontSize: 11.5, color: "var(--green)", flexShrink: 0 }}>
                                                ✓ {new Date(ct.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </Fragment>
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

            {/* ── Leaderboards ───────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="card anim-up" style={{ overflow: "hidden" }}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)" }}><p className="section-title">Top Performers</p></div>
                {topPerformers.length === 0 ? (
                  <div className="empty" style={{ padding: 30 }}><p>No task data yet</p></div>
                ) : topPerformers.map(({ e: emp, n, rate }, i) => (
                  <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--tx-tertiary)", width: 16 }}>{i + 1}</span>
                    <div className="avatar" style={{ width: 26, height: 26, fontSize: 9.5 }}>{initials(emp.name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.name}</p>
                      <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{n.completed}/{n.total} completed · {emp.department}</p>
                    </div>
                    <span className="badge badge-green" style={{ flexShrink: 0 }}>{rate}%</span>
                  </div>
                ))}
              </div>

              <div className="card anim-up" style={{ overflow: "hidden" }}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)" }}><p className="section-title">Needs Attention</p></div>
                {needsAttention.length === 0 ? (
                  <div className="empty" style={{ padding: 30 }}><p>No task data yet</p></div>
                ) : needsAttention.map(({ e: emp, n, rate }) => (
                  <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                    <span className="dot" style={{ background: rateColor(rate) }} />
                    <div className="avatar" style={{ width: 26, height: 26, fontSize: 9.5 }}>{initials(emp.name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.name}</p>
                      <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>
                        {n.pending} open{n.changes > 0 ? ` · ${n.changes} changes` : ""}{n.failed > 0 ? ` · ${n.failed} failed` : ""}
                      </p>
                    </div>
                    <span className="badge" style={{ flexShrink: 0, background: `color-mix(in srgb, ${rateColor(rate)} 16%, transparent)`, color: rateColor(rate) }}>{rate}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Promo ribbon ──────────────────────────────────── */}
            <div className="promo-ribbon anim-up">
              <div className="item"><span className="ico">📊</span><span className="txt"><p className="t">Measure What Matters</p><p className="s">Completion rates per person and team</p></span></div>
              <div className="item"><span className="ico">⚖️</span><span className="txt"><p className="t">Balanced Workloads</p><p className="s">Spot who is overloaded early</p></span></div>
              <div className="item"><span className="ico">🎯</span><span className="txt"><p className="t">Fewer Reworks</p><p className="s">Track changes requested by clients</p></span></div>
              <div className="item"><span className="ico">🚀</span><span className="txt"><p className="t">Improve Every Month</p><p className="s">Built for growing teams</p></span></div>
            </div>
          </div>

          {/* ── Right rail ────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="rail-card anim-up">
              <p className="section-title" style={{ marginBottom: 12 }}>Team Summary</p>
              {([
                ["Team members", stats.length, "var(--tx-primary)"],
                ["Tasks assigned", totals.total, "var(--accent)"],
                ["Completed", totals.completed, "var(--green)"],
                ["Still open", totals.pending, "var(--blue)"],
                ["Changes", totals.changes, "var(--amber)"],
                ["Failed", totals.failed, "var(--red)"],
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p className="section-title">Overall Rate</p>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{overallRate}%</span>
              </div>
              <div className="progress-track" style={{ height: 8, marginBottom: 12 }}>
                <div style={{ display: "flex", height: "100%" }}>
                  {segments.map((s) => (
                    <div key={s.label} style={{ width: totals.total > 0 ? `${(s.count / totals.total) * 100}%` : 0, background: s.color, transition: "width .7s cubic-bezier(.16,1,.3,1)" }} />
                  ))}
                </div>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>
                {totals.completed} of {totals.total} {scopeLabel} completed · {avgRate}% average per employee
              </p>
            </div>

            <div className="rail-card anim-up">
              <p className="section-title" style={{ marginBottom: 12 }}>Quick Actions</p>
              <Link href="/dashboard/tasks" className="rail-action-btn">
                <span className="rail-action-icon" style={{ background: "var(--purple-bg)" }}>✅</span>View All Tasks
              </Link>
              <Link href="/dashboard/employees" className="rail-action-btn">
                <span className="rail-action-icon" style={{ background: "var(--blue-bg)" }}>👥</span>View Employees
              </Link>
              <Link href="/dashboard/clients" className="rail-action-btn" >
                <span className="rail-action-icon" style={{ background: "var(--green-bg)" }}>🤝</span>View Clients
              </Link>
              <Link href="/dashboard" className="rail-action-btn" style={{ marginBottom: 0 }}>
                <span className="rail-action-icon" style={{ background: "var(--amber-bg)" }}>🏠</span>Back to Overview
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
