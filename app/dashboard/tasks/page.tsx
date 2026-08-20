"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import TaskCategoryBadge from "@/components/TaskCategoryBadge";

type Employee = { id: string; name: string; department: string; position: string };
type Task = {
  id: string; title: string; description?: string;
  category?: string | null; subCategory?: string | null; taskType?: string | null;
  status: string; priority: string; startDate: string; endDate: string; completedAt?: string | null;
  employee: Employee;
  _type?: "client";
  client?: { id: string; name: string; company?: string };
};

const PRIS = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const INT_S = ["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"];
const CLI_S = ["PENDING", "IN_PROGRESS", "COMPLETED", "CHANGES_REQUIRED", "OVERDUE"];
const S_BADGE: Record<string, string> = { PENDING: "badge-gray", IN_PROGRESS: "badge-blue", COMPLETED: "badge-green", CHANGES_REQUIRED: "badge-amber", OVERDUE: "badge-red" };
const S_LABEL: Record<string, string> = { PENDING: "Pending", IN_PROGRESS: "In progress", COMPLETED: "Done", CHANGES_REQUIRED: "Changes needed", OVERDUE: "Overdue" };
const P_COLOR: Record<string, string> = { LOW: "var(--tx-tertiary)", MEDIUM: "var(--blue)", HIGH: "var(--amber)", URGENT: "var(--red)" };
const STATUS_COLORS: Record<string, string> = { COMPLETED: "var(--green)", IN_PROGRESS: "var(--blue)", PENDING: "var(--amber)", OVERDUE: "var(--red)" };
const DEPT_COLORS: Record<string, string> = { Engineering: "#7c3aed", Design: "#ec4899", Marketing: "#2383E2", Sales: "#0F9D58", HR: "#D97706", Finance: "#0891b2", Operations: "#db2777" };
const PAGE_SIZE = 8;

function isOverdue(t: Task, now: Date) { return t.status !== "COMPLETED" && new Date(t.endDate) < now; }

function timeAgo(date: Date | string, now: Date): string {
  const mins = Math.floor((now.getTime() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
function dueLabel(date: Date | string, now: Date): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const t = new Date(date);
  const diff = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime() - start.getTime()) / 86400000);
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff === -1) return "1 day overdue";
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  return `In ${diff} days`;
}
function initials(name: string) { return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2); }

function TaskModal({ task, employees, onClose, onSave }: { task?: Task | null; employees: Employee[]; onClose: () => void; onSave: () => void }) {
  const isClient = task?._type === "client";
  const [form, setForm] = useState({
    title: task?.title || "", description: task?.description || "",
    priority: task?.priority || "MEDIUM", status: task?.status || "PENDING",
    startDate: task?.startDate ? task.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
    endDate: task?.endDate ? task.endDate.split("T")[0] : "",
    employeeId: task?.employee?.id || employees[0]?.id || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const statuses = isClient ? CLI_S : INT_S;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const url = task ? (isClient ? `/api/client-tasks/${task.id}` : `/api/tasks/${task.id}`) : `/api/tasks`;
      const res = await fetch(url, { method: task ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      onSave(); onClose();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop anim-in">
      <div className="modal anim-scale">
        <div className="modal-header">
          <div>
            <p className="section-title">{task ? "Edit task" : "Create task"}</p>
            {isClient && task?.client && <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 2 }}>Client: {task.client.company || task.client.name}</p>}
          </div>
          <button className="btn-ghost btn-icon" onClick={onClose}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ padding: "8px 12px", background: "var(--red-bg)", borderRadius: "var(--r-md)", color: "var(--red)", fontSize: 13, marginBottom: 14 }}>{error}</div>}
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label className="label" style={{ marginBottom: 5 }}>Title *</label><input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title…" /></div>
            <div><label className="label" style={{ marginBottom: 5 }}>Description</label><textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ minHeight: 60 }} /></div>
            {!isClient && (
              <div>
                <label className="label" style={{ marginBottom: 5 }}>Assigned to *</label>
                <select className="input" required value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                  <option value="">Select employee…</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.department}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label className="label" style={{ marginBottom: 5 }}>Priority</label><select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{PRIS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="label" style={{ marginBottom: 5 }}>Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></div>
              <div><label className="label" style={{ marginBottom: 5 }}>Start date *</label><input className="input" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><label className="label" style={{ marginBottom: 5 }}>End date *</label><input className="input" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading && <span className="spinner" style={{ width: 13, height: 13, borderTopColor: "rgba(255,255,255,0.7)" }} />}
                {loading ? "Saving…" : task ? "Save changes" : "Create task"}
              </button>
            </div>
          </form>
        </div>
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
        <polyline points={`0,40 ${points} 100,40`} fill="url(#taskChartFill)" stroke="none" />
        <polyline points={points} fill="none" stroke="#7c3aed" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="taskChartFill" x1="0" y1="0" x2="0" y2="1">
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

/** Donut built from conic-gradient segments */
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

export default function TasksPage() {
  const [intTasks, setIntTasks] = useState<Task[]>([]);
  const [cliTasks, setCliTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [source, setSource] = useState<"all" | "internal" | "client">("all");
  const [sf, setSf] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const now = useMemo(() => new Date(), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ir, cr, er] = await Promise.all([fetch("/api/tasks"), fetch("/api/client-tasks"), fetch("/api/employees")]);
    const [idata, cdata, edata] = await Promise.all([ir.json(), cr.json(), er.json()]);
    setIntTasks(Array.isArray(idata) ? idata : []);
    setCliTasks((Array.isArray(cdata) ? cdata : []).filter((t: Task) => t.employee).map((t: Task) => ({ ...t, _type: "client" as const })));
    setEmployees(Array.isArray(edata) ? edata : []);
    setLoading(false);
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  async function markDone(task: Task) {
    const url = task._type === "client" ? `/api/client-tasks/${task.id}` : `/api/tasks/${task.id}`;
    await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "COMPLETED" }) });
    fetchData();
  }
  async function del(task: Task) {
    await fetch(task._type === "client" ? `/api/client-tasks/${task.id}` : `/api/tasks/${task.id}`, { method: "DELETE" });
    fetchData();
  }

  // ── Scope (source tab) then derive everything from it ────────────────────
  const scoped = useMemo(
    () => [...(source === "client" ? [] : intTasks), ...(source === "internal" ? [] : cliTasks)],
    [source, intTasks, cliTasks],
  );

  const completed = scoped.filter((t) => t.status === "COMPLETED").length;
  const inProgress = scoped.filter((t) => t.status === "IN_PROGRESS").length;
  const pending = scoped.filter((t) => t.status === "PENDING").length;
  const overdueCount = scoped.filter((t) => isOverdue(t, now)).length;
  const rate = scoped.length > 0 ? Math.round((completed / scoped.length) * 100) : 0;

  const counts = {
    all: scoped.length,
    PENDING: pending,
    IN_PROGRESS: inProgress,
    COMPLETED: completed,
    OVERDUE: overdueCount,
  };

  // Department progress
  const deptMap = new Map<string, { done: number; total: number }>();
  for (const t of scoped) {
    const dept = t.employee?.department || "Unassigned";
    const cur = deptMap.get(dept) || { done: 0, total: 0 };
    cur.total++; if (t.status === "COMPLETED") cur.done++;
    deptMap.set(dept, cur);
  }
  const deptRows = Array.from(deptMap.entries())
    .map(([name, v]) => ({ name, pct: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0, total: v.total }))
    .sort((a, b) => b.total - a.total).slice(0, 6);

  // Team workload — per employee completion
  const empMap = new Map<string, { name: string; id: string; done: number; total: number }>();
  for (const t of scoped) {
    if (!t.employee) continue;
    const cur = empMap.get(t.employee.id) || { name: t.employee.name, id: t.employee.id, done: 0, total: 0 };
    cur.total++; if (t.status === "COMPLETED") cur.done++;
    empMap.set(t.employee.id, cur);
  }
  const workload = Array.from(empMap.values())
    .map((e) => ({ ...e, pct: e.total > 0 ? Math.round((e.done / e.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total).slice(0, 6);

  // Priority breakdown
  const prioCounts = PRIS.map((p) => ({ label: p, count: scoped.filter((t) => t.priority === p).length, color: P_COLOR[p] }));

  // Top priority open tasks
  const topPriority = scoped
    .filter((t) => t.status !== "COMPLETED" && (t.priority === "URGENT" || t.priority === "HIGH"))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === "URGENT" ? -1 : 1;
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    }).slice(0, 5);

  // Upcoming deadlines / recent activity
  const upcoming = scoped
    .filter((t) => t.status !== "COMPLETED")
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()).slice(0, 5);
  const activity = scoped
    .filter((t) => t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()).slice(0, 6);

  // Today's tasks
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000 - 1);
  const todayTasks = scoped.filter((t) => new Date(t.endDate) >= startOfToday && new Date(t.endDate) <= endOfToday);

  // Table filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((t) => {
      if (sf === "OVERDUE" ? !isOverdue(t, now) : sf && t.status !== sf) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (q) {
        const hay = [t.title, t.description, t.employee?.name, t.client?.company, t.client?.name, t.category].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scoped, sf, priorityFilter, search, now]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageTasks = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, sf, priorityFilter, source]);

  const STAT_CARDS = [
    { label: "Total Tasks", val: scoped.length, sub: `${intTasks.length} internal · ${cliTasks.length} client`, bg: "var(--purple-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" /></svg> },
    { label: "Completed", val: completed, sub: `${rate}% of all tasks`, bg: "var(--green-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F9D58" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
    { label: "In Progress", val: inProgress, sub: "being worked on", bg: "var(--blue-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2383E2" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { label: "Pending", val: pending, sub: "not started", bg: "var(--amber-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> },
    { label: "Overdue", val: overdueCount, sub: "past due date", bg: "var(--red-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
    { label: "Completion Rate", val: `${rate}%`, sub: "across all tasks", bg: "var(--purple-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> },
  ];

  const statusSegments = [
    { label: "Completed", count: completed, color: STATUS_COLORS.COMPLETED },
    { label: "In Progress", count: inProgress, color: STATUS_COLORS.IN_PROGRESS },
    { label: "Pending", count: pending, color: STATUS_COLORS.PENDING },
    { label: "Overdue", count: overdueCount, color: STATUS_COLORS.OVERDUE },
  ];

  return (
    <div className="wide-section">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }} className="anim-up">
        <div>
          <h1 className="page-title" style={{ fontSize: 24 }}>Tasks</h1>
          <p style={{ fontSize: 13.5, color: "var(--tx-tertiary)", marginTop: 5 }}>
            {intTasks.length} internal · {cliTasks.length} client-assigned · {employees.length} team members
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="filter-tabs-wrap">
            {([["all", "All"], ["internal", "Internal"], ["client", "Client"]] as const).map(([k, l]) => (
              <button key={k} className={`filter-tab${source === k ? " active" : ""}`} onClick={() => { setSource(k); setSf(""); }}>{l}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => { setSelected(null); setModal("add"); }} disabled={employees.length === 0}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Create task
          </button>
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

            {/* ── Progress overview / trend / department bars ─────── */}
            <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1fr 1fr", gap: 16 }}>
              <div className="card anim-up d2" style={{ padding: "14px 16px" }}>
                <p className="section-title" style={{ marginBottom: 10 }}>Task Progress</p>
                <Donut segments={statusSegments} centerValue={scoped.length} centerLabel="Tasks" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {statusSegments.map((s) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span className="dot" style={{ background: s.color }} />
                      <span style={{ fontSize: 12, color: "var(--tx-secondary)", flex: 1 }}>{s.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-primary)" }}>
                        {s.count}
                        <span style={{ fontWeight: 400, color: "var(--tx-tertiary)" }}>
                          {" "}({scoped.length > 0 ? Math.round((s.count / scoped.length) * 100) : 0}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card anim-up d3" style={{ padding: "14px 16px" }}>
                <p className="section-title" style={{ marginBottom: 10 }}>Tasks Completed (7 days)</p>
                <WeeklyChart tasks={scoped} />
              </div>

              <div className="card anim-up d4" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p className="section-title">Department Progress</p>
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
                        <div className="dept-bar-track"><div className="dept-bar-fill" style={{ width: `${row.pct}%`, background: DEPT_COLORS[row.name] || "#7c3aed" }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── All tasks table ────────────────────────────────── */}
            <div className="card anim-up" style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <p className="section-title" style={{ marginRight: "auto" }}>All Tasks ({filtered.length})</p>
                <div className="filter-tabs-wrap">
                  {([["", "All", counts.all], ["PENDING", "Pending", counts.PENDING], ["IN_PROGRESS", "Active", counts.IN_PROGRESS], ["COMPLETED", "Done", counts.COMPLETED], ["OVERDUE", "Overdue", counts.OVERDUE]] as [string, string, number][]).map(([k, l, c]) => (
                    <button key={k} className={`filter-tab${sf === k ? " active" : ""}`} onClick={() => setSf(k)}>
                      {l} <span className="count">{c}</span>
                    </button>
                  ))}
                </div>
                <select className="input" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ width: "auto", fontSize: 12.5 }}>
                  <option value="">All priorities</option>
                  {PRIS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="search-wrap" style={{ maxWidth: 190 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" />
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="empty" style={{ padding: 60 }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>✅</p>
                  <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>{scoped.length === 0 ? "No tasks yet" : "No tasks match your filters"}</p>
                  <p style={{ fontSize: 13 }}>{scoped.length === 0 ? "Create your first task to get started" : "Try a different search, status or priority"}</p>
                </div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr><th>Task</th><th>Assigned to</th><th>Source</th><th>Priority</th><th>Status</th><th>Due</th><th></th></tr>
                      </thead>
                      <tbody>
                        {pageTasks.map((task) => {
                          const od = isOverdue(task, now);
                          return (
                            <tr key={`${task._type || "int"}-${task.id}`} onClick={() => { setSelected(task); setModal("edit"); }} title="Edit task">
                              <td style={{ maxWidth: 240 }}>
                                {task.category && <div style={{ marginBottom: 4 }}><TaskCategoryBadge category={task.category} compact /></div>}
                                <p style={{ fontSize: 13, fontWeight: 500, color: task.status === "COMPLETED" ? "var(--tx-tertiary)" : "var(--tx-primary)", textDecoration: task.status === "COMPLETED" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</p>
                                {task.description && <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.description}</p>}
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <Link href={`/dashboard/employees/${task.employee.id}`} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                                  <div className="avatar" style={{ width: 24, height: 24, fontSize: 9 }}>{initials(task.employee.name)}</div>
                                  <span style={{ fontSize: 12.5, color: "var(--tx-primary)", whiteSpace: "nowrap" }}>{task.employee.name}</span>
                                </Link>
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                {task._type === "client" && task.client ? (
                                  <Link href={`/dashboard/clients/${task.client.id}`} className="badge badge-purple" style={{ textDecoration: "none" }}>
                                    {task.client.company || task.client.name}
                                  </Link>
                                ) : <span className="badge badge-gray">Internal</span>}
                              </td>
                              <td>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: P_COLOR[task.priority] }}>
                                  <span className="dot" style={{ background: P_COLOR[task.priority] }} />{task.priority}
                                </span>
                              </td>
                              <td><span className={`badge ${od ? "badge-red" : S_BADGE[task.status] || "badge-gray"}`}>{od ? "Overdue" : S_LABEL[task.status] || task.status}</span></td>
                              <td style={{ fontSize: 12.5, color: od ? "var(--red)" : "var(--tx-tertiary)", whiteSpace: "nowrap" }}>{formatDate(task.endDate)}</td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                                  {task.status !== "COMPLETED" && (
                                    <button className="btn-ghost btn-icon" title="Mark done" onClick={() => markDone(task)}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                    </button>
                                  )}
                                  <button className="btn-ghost btn-icon" title="Edit" onClick={() => { setSelected(task); setModal("edit"); }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                  </button>
                                  <button className="btn-ghost btn-icon" title="Delete" onClick={() => del(task)}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
                                  </button>
                                </div>
                              </td>
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

            {/* ── Upcoming deadlines / recent activity ───────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="card anim-up" style={{ overflow: "hidden" }}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)" }}><p className="section-title">Upcoming Deadlines</p></div>
                {upcoming.length === 0 ? (
                  <div className="empty" style={{ padding: 30 }}><p>Nothing upcoming</p></div>
                ) : upcoming.map((t) => {
                  const od = isOverdue(t, now);
                  return (
                    <div key={`u-${t._type || "int"}-${t.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: "1px solid var(--border)" }}>
                      <span className="dot" style={{ background: od ? "var(--red)" : "var(--accent)" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                        <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{t.employee?.name}{t.client ? ` · ${t.client.company || t.client.name}` : ""}</p>
                      </div>
                      <span style={{ fontSize: 11.5, color: od ? "var(--red)" : "var(--tx-tertiary)", flexShrink: 0, fontWeight: 500 }}>{dueLabel(t.endDate, now)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="card anim-up" style={{ overflow: "hidden" }}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)" }}><p className="section-title">Recent Activity</p></div>
                {activity.length === 0 ? (
                  <div className="empty" style={{ padding: 30 }}><p>No completed tasks yet</p></div>
                ) : activity.map((t) => (
                  <div key={`a-${t._type || "int"}-${t.id}`} className="activity-row" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="activity-icon">✅</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, color: "var(--tx-primary)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.title} — {t.employee?.name}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--tx-tertiary)", marginTop: 2 }}>{timeAgo(t.completedAt!, now)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Breakdown / top priority / team workload ───────── */}
            <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr 1.1fr", gap: 16 }}>
              <div className="card anim-up" style={{ padding: "14px 16px" }}>
                <p className="section-title" style={{ marginBottom: 10 }}>Task Breakdown</p>
                <Donut segments={prioCounts} centerValue={scoped.length} centerLabel="Tasks" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {prioCounts.map((p) => (
                    <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span className="dot" style={{ background: p.color }} />
                      <span style={{ fontSize: 12, color: "var(--tx-secondary)", flex: 1 }}>{p.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-primary)" }}>
                        {p.count}
                        <span style={{ fontWeight: 400, color: "var(--tx-tertiary)" }}>
                          {" "}({scoped.length > 0 ? Math.round((p.count / scoped.length) * 100) : 0}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card anim-up" style={{ overflow: "hidden" }}>
                <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)" }}><p className="section-title">Top Priority Tasks</p></div>
                {topPriority.length === 0 ? (
                  <div className="empty" style={{ padding: 30 }}><p>No urgent or high-priority tasks open</p></div>
                ) : topPriority.map((t) => (
                  <div key={`p-${t._type || "int"}-${t.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ width: 15, height: 15, borderRadius: 4, border: "1.5px solid var(--border-md)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                      <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{t.employee?.name}{t.client ? ` · ${t.client.company || t.client.name}` : ""}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: P_COLOR[t.priority], flexShrink: 0 }}>{t.priority}</span>
                  </div>
                ))}
              </div>

              <div className="card anim-up" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p className="section-title">Team Workload</p>
                  <Link href="/dashboard/employees" style={{ fontSize: 12, color: "var(--tx-tertiary)", textDecoration: "none" }}>View all →</Link>
                </div>
                {workload.length === 0 ? (
                  <div className="empty" style={{ padding: 20 }}><p>No assignments yet</p></div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {workload.map((w) => (
                      <div key={w.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
                          <span style={{ fontSize: 12, color: "var(--tx-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</span>
                          <span style={{ fontSize: 12, color: "var(--tx-tertiary)", flexShrink: 0 }}>
                            {w.done}/{w.total} · <span style={{ fontWeight: 600, color: "var(--tx-primary)" }}>{w.pct}%</span>
                          </span>
                        </div>
                        <div className="dept-bar-track">
                          <div className="dept-bar-fill" style={{ width: `${w.pct}%`, background: w.pct >= 65 ? "var(--green)" : w.pct >= 35 ? "var(--amber)" : "var(--red)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Promo ribbon ──────────────────────────────────── */}
            <div className="promo-ribbon anim-up">
              <div className="item"><span className="ico">✅</span><span className="txt"><p className="t">Everything in One Place</p><p className="s">Internal and client work, one board</p></span></div>
              <div className="item"><span className="ico">⚡</span><span className="txt"><p className="t">Never Miss a Deadline</p><p className="s">Overdue work surfaces instantly</p></span></div>
              <div className="item"><span className="ico">📈</span><span className="txt"><p className="t">Balanced Workloads</p><p className="s">See who has capacity at a glance</p></span></div>
              <div className="item"><span className="ico">🚀</span><span className="txt"><p className="t">Deliver More, Stress Less</p><p className="s">Built for growing teams</p></span></div>
            </div>
          </div>

          {/* ── Right rail ────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="rail-card anim-up">
              <p className="section-title" style={{ marginBottom: 12 }}>Today&apos;s Summary</p>
              {([
                ["Total tasks", scoped.length, "var(--tx-primary)"],
                ["Completed", completed, "var(--green)"],
                ["In progress", inProgress, "var(--blue)"],
                ["Pending", pending, "var(--amber)"],
                ["Overdue", overdueCount, "var(--red)"],
                ["Due today", todayTasks.length, "var(--accent)"],
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
              <p className="section-title" style={{ marginBottom: 12 }}>Quick Actions</p>
              <button className="rail-action-btn" onClick={() => { setSelected(null); setModal("add"); }} disabled={employees.length === 0}>
                <span className="rail-action-icon" style={{ background: "var(--purple-bg)" }}>✅</span>New Task
              </button>
              <Link href="/dashboard/employees" className="rail-action-btn">
                <span className="rail-action-icon" style={{ background: "var(--blue-bg)" }}>👥</span>View Employees
              </Link>
              <Link href="/dashboard/clients" className="rail-action-btn">
                <span className="rail-action-icon" style={{ background: "var(--green-bg)" }}>🤝</span>View Clients
              </Link>
              <Link href="/dashboard/performance" className="rail-action-btn">
                <span className="rail-action-icon" style={{ background: "var(--amber-bg)" }}>📊</span>View Reports
              </Link>
              <button className="rail-action-btn" onClick={fetchData} style={{ marginBottom: 0 }}>
                <span className="rail-action-icon" style={{ background: "var(--gray-tag)" }}>🔄</span>Refresh Data
              </button>
            </div>

            <div className="rail-card anim-up">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p className="section-title">Status Split</p>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>{rate}%</span>
              </div>
              <div className="progress-track" style={{ height: 8, marginBottom: 12 }}>
                <div style={{ display: "flex", height: "100%" }}>
                  {statusSegments.map((s) => (
                    <div key={s.label} style={{ width: scoped.length > 0 ? `${(s.count / scoped.length) * 100}%` : 0, background: s.color, transition: "width .7s cubic-bezier(.16,1,.3,1)" }} />
                  ))}
                </div>
              </div>
              {statusSegments.map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0" }}>
                  <span className="dot" style={{ background: s.color }} />
                  <span style={{ fontSize: 12, color: "var(--tx-secondary)", flex: 1 }}>{s.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx-primary)" }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(modal === "add" || modal === "edit") && (
        <TaskModal task={modal === "edit" ? selected : null} employees={employees} onClose={() => setModal(null)} onSave={fetchData} />
      )}
    </div>
  );
}
