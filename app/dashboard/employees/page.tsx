"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

import { resolveBirthday, toDateInputValue } from "@/lib/birthdays";

type Task = { id: string; status: string; title: string; priority: string; startDate: string; endDate: string; completedAt?: string | null };
type Employee = { id: string; name: string; email: string; phone?: string; department: string; position: string; status: string; portalEnabled: boolean; joinedAt: string; dateOfBirth?: string | null; tasks: Task[] };

const DEPTS    = ["Engineering","Design","Marketing","Sales","HR","Finance","Operations"];
const STATUSES = ["ACTIVE","INACTIVE","ON_LEAVE"];
const S_BADGE: Record<string,string>  = { ACTIVE:"badge-green", INACTIVE:"badge-red", ON_LEAVE:"badge-amber" };
const S_LABEL: Record<string,string>  = { ACTIVE:"Active", INACTIVE:"Inactive", ON_LEAVE:"On leave" };
const PAGE_SIZE = 8;
const BUCKET_COLORS: Record<string, string> = { Active: "var(--green)", "On Leave": "var(--amber)", Inactive: "var(--red)" };
const DEPT_COLORS: Record<string, string> = { Engineering: "#7c3aed", Design: "#ec4899", Marketing: "#2383E2", Sales: "#0F9D58", HR: "#D97706", Finance: "#0891b2", Operations: "#db2777" };

type BirthdayStatus = "today" | "tomorrow" | null;

/** Reads the stored date of birth, falling back to the legacy name-matched list */
function getBirthdayStatus(emp: { name: string; dateOfBirth?: string | null }): BirthdayStatus {
  const b = resolveBirthday(emp);
  if (!b) return null;
  if (b.isToday) return "today";
  if (b.isTomorrow) return "tomorrow";
  return null;
}

function employeeMetrics(e: Employee, now: Date) {
  const total = e.tasks.length;
  const done = e.tasks.filter(t => t.status === "COMPLETED").length;
  const overdueCount = e.tasks.filter(t => t.status !== "COMPLETED" && new Date(t.endDate) < now).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const bucket = e.status === "ON_LEAVE" ? "On Leave" : e.status === "INACTIVE" ? "Inactive" : "Active";
  const nextTask = e.tasks.filter(t => t.status !== "COMPLETED").sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())[0];
  return { total, done, overdueCount, pct, bucket, nextTask };
}
function isOverdue(t: Task, now: Date) { return t.status !== "COMPLETED" && new Date(t.endDate) < now; }
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

function Modal({ emp, onClose, onSave }: { emp?: Employee|null; onClose:()=>void; onSave:()=>void }) {
  const [f, setF] = useState({
    name: emp?.name || "", email: emp?.email || "", phone: emp?.phone || "",
    department: emp?.department || DEPTS[0], position: emp?.position || "",
    status: emp?.status || "ACTIVE", dateOfBirth: toDateInputValue(emp?.dateOfBirth),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch(emp ? `/api/employees/${emp.id}` : "/api/employees", { method: emp?"PUT":"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(f) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      onSave(); onClose();
    } catch(err: unknown) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  }
  return (
    <div className="modal-backdrop anim-in">
      <div className="modal anim-scale">
        <div className="modal-header">
          <p className="section-title">{emp ? "Edit employee" : "Add employee"}</p>
          <button className="btn-ghost btn-icon" onClick={onClose}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div className="modal-body">
          {error && <div style={{ padding:"8px 12px", background:"var(--red-bg)", borderRadius:"var(--r-md)", color:"var(--red)", fontSize:13, marginBottom:14 }}>{error}</div>}
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ gridColumn:"1/-1" }}>
                <label className="label" style={{ marginBottom:5 }}>Full name *</label>
                <input className="input" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Full name" />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label className="label" style={{ marginBottom:5 }}>Email *</label>
                <input className="input" type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="Email" />
              </div>
              <div>
                <label className="label" style={{ marginBottom:5 }}>Phone</label>
                <input className="input" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="Phone" />
              </div>
              <div>
                <label className="label" style={{ marginBottom:5 }}>Status</label>
                <select className="input" value={f.status} onChange={e => setF({...f, status:e.target.value})}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                </select>
              </div>
              <div>
                <label className="label" style={{ marginBottom:5 }}>Department *</label>
                <select className="input" required value={f.department} onChange={e => setF({...f, department:e.target.value})}>
                  {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label" style={{ marginBottom:5 }}>Position *</label>
                <input className="input" required value={f.position} onChange={e => setF({ ...f, position: e.target.value })} placeholder="Position" />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label className="label" style={{ marginBottom:5 }}>Date of birth 🎂</label>
                <input className="input" type="date" value={f.dateOfBirth} onChange={e => setF({ ...f, dateOfBirth: e.target.value })} />
                <p style={{ fontSize:11.5, color:"var(--tx-tertiary)", marginTop:4 }}>
                  Used for birthday reminders on the dashboard and their profile
                </p>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <button type="button" className="btn btn-secondary" style={{ flex:1 }} onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex:1 }} disabled={loading}>
                {loading && <span className="spinner" style={{ width:13, height:13, borderTopColor:"rgba(255,255,255,0.7)" }} />}
                {loading ? "Saving…" : emp ? "Save changes" : "Add employee"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ emp, onClose, onDelete }: { emp:Employee; onClose:()=>void; onDelete:()=>void }) {
  const [loading, setLoading] = useState(false);
  async function del() { setLoading(true); await fetch(`/api/employees/${emp.id}`,{method:"DELETE"}); onDelete(); onClose(); }
  return (
    <div className="modal-backdrop anim-in">
      <div className="modal anim-scale" style={{ maxWidth:360 }}>
        <div className="modal-body" style={{ textAlign:"center", padding:"28px 24px" }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
          <p style={{ fontSize:15, fontWeight:600, color:"var(--tx-primary)", marginBottom:6 }}>Delete employee?</p>
          <p style={{ fontSize:13.5, color:"var(--tx-secondary)", marginBottom:20 }}>
            <strong style={{ color:"var(--tx-primary)" }}>{emp.name}</strong> and all their tasks will be permanently removed.
          </p>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-secondary" style={{ flex:1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-danger" style={{ flex:1 }} onClick={del} disabled={loading}>{loading?"Deleting…":"Delete"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeeklyChart({ employees }: { employees: Employee[] }) {
  const now = new Date();
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = new Date(day.getTime() + 86400000);
    let count = 0;
    for (const e of employees) for (const t of e.tasks) {
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
        <polyline points={`0,40 ${points} 100,40`} fill="url(#empChartFill)" stroke="none" />
        <polyline points={points} fill="none" stroke="#7c3aed" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="empChartFill" x1="0" y1="0" x2="0" y2="1">
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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"add"|"edit"|"delete"|null>(null);
  const [selected, setSelected] = useState<Employee|null>(null);
  const now = useMemo(() => new Date(), []);


  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/employees`);
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const todayBirthdays    = employees.filter(e => getBirthdayStatus(e) === "today");
  const tomorrowBirthdays = employees.filter(e => getBirthdayStatus(e) === "tomorrow");

  const withMetrics = useMemo(() => employees.map(e => ({ e, m: employeeMetrics(e, now) })), [employees, now]);
  const allTasks = useMemo(() => employees.flatMap(e => e.tasks), [employees]);
  const completedTasks = allTasks.filter(t => t.status === "COMPLETED").length;
  const pendingTasks = allTasks.filter(t => t.status === "PENDING").length;
  const overdueTasksCount = allTasks.filter(t => isOverdue(t, now)).length;
  const ratedEmployees = withMetrics.filter(({ m }) => m.total > 0);
  const avgProgress = ratedEmployees.length > 0 ? Math.round(ratedEmployees.reduce((s, { m }) => s + m.pct, 0) / ratedEmployees.length) : 0;

  const bucketCounts = { Active: 0, "On Leave": 0, Inactive: 0 };
  for (const { m } of withMetrics) bucketCounts[m.bucket as keyof typeof bucketCounts]++;
  const bucketTotal = Math.max(1, employees.length);

  // Department progress
  const deptMap = new Map<string, { done: number; total: number }>();
  for (const e of employees) {
    const cur = deptMap.get(e.department) || { done: 0, total: 0 };
    cur.done += e.tasks.filter(t => t.status === "COMPLETED").length;
    cur.total += e.tasks.length;
    deptMap.set(e.department, cur);
  }
  const deptRows = Array.from(deptMap.entries())
    .map(([name, v]) => ({ name, pct: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0, total: v.total }))
    .sort((a, b) => b.total - a.total).slice(0, 6);

  // Upcoming deadlines
  const upcoming = withMetrics
    .filter(({ m }) => m.nextTask)
    .map(({ e, m }) => ({ empName: e.name, title: m.nextTask!.title, endDate: m.nextTask!.endDate, overdue: isOverdue(m.nextTask!, now) }))
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    .slice(0, 5);

  // Recent activity
  const activity = [
    ...employees.map(e => ({ id: `e-${e.id}`, icon: "👤", text: `New employee joined — ${e.name}`, at: e.joinedAt })),
    ...allTasks.filter(t => t.completedAt).map(t => ({ id: `t-${t.id}`, icon: "✅", text: `Task completed — ${t.title}`, at: t.completedAt! })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6);

  // Today's summary
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000 - 1);
  const todayTasks = allTasks.filter(t => new Date(t.endDate) >= startOfToday && new Date(t.endDate) <= endOfToday);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withMetrics.filter(({ e, m }) => {
      const matchesSearch = !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.department.toLowerCase().includes(q);
      const matchesFilter = filter === "All" || m.bucket === filter || e.department === filter;
      return matchesSearch && matchesFilter;
    });
  }, [withMetrics, search, filter]);
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const pageEmployees = filteredEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, filter]);

  const STAT_CARDS = [
    { label: "Total Employees", val: employees.length, sub: `${bucketCounts.Active} active`, bg: "var(--purple-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
    { label: "Completed Tasks", val: completedTasks, sub: `of ${allTasks.length} total`, bg: "var(--green-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F9D58" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
    { label: "Pending Tasks", val: pendingTasks, sub: "awaiting start", bg: "var(--amber-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { label: "Overdue Tasks", val: overdueTasksCount, sub: "need attention", bg: "var(--red-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
    { label: "Avg. Progress", val: `${avgProgress}%`, sub: "across all employees", bg: "var(--blue-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2383E2" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ];

  const donutSegs = (["Active", "On Leave", "Inactive"] as const).map(k => ({ key: k, count: bucketCounts[k], pct: bucketCounts[k] / bucketTotal }));
  let acc = 0;
  const gradientParts = donutSegs.map(s => { const start = acc * 360; acc += s.pct; const end = acc * 360; return `${BUCKET_COLORS[s.key]} ${start}deg ${end}deg`; }).join(", ");

  return (
    <div className="wide-section">
      <style>{`
        @keyframes bday-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes bday-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-3px); } }
        .bday-banner-today { position: relative; overflow: hidden; border-radius: 14px; margin-bottom: 18px; padding: 18px 22px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 80%, #f97316 100%); box-shadow: 0 4px 24px 0 rgba(124,58,237,.35); display: flex; align-items: center; gap: 16px; animation: bday-float 3s ease-in-out infinite; }
        .bday-banner-today::before { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.18) 50%, transparent 100%); background-size: 400px 100%; animation: bday-shimmer 2.4s linear infinite; pointer-events: none; }
        .bday-banner-tomorrow { border-radius: 14px; margin-bottom: 18px; padding: 14px 20px; background: linear-gradient(135deg, rgba(124,58,237,.12) 0%, rgba(168,85,247,.10) 100%); border: 1.5px solid rgba(124,58,237,.30); display: flex; align-items: center; gap: 14px; }
        .bday-emoji { font-size: 30px; flex-shrink: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,.18)); }
        .bday-emoji-sm { font-size: 22px; flex-shrink: 0; }
        .bday-names-today { font-size: 15px; font-weight: 700; color: #fff; line-height: 1.4; }
        .bday-sub-today { font-size: 12px; color: rgba(255,255,255,.78); margin-top: 2px; }
        .bday-names-tomorrow { font-size: 14px; font-weight: 600; color: var(--tx-primary); line-height: 1.4; }
        .bday-sub-tomorrow { font-size: 12px; color: var(--tx-tertiary); margin-top: 2px; }
        .bday-pill { margin-left: auto; flex-shrink: 0; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; background: rgba(255,255,255,.22); color: #fff; }
        .bday-pill-tomorrow { margin-left: auto; flex-shrink: 0; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; background: rgba(124,58,237,.14); color: var(--accent); }
        .bday-row-highlight { background: linear-gradient(90deg, rgba(124,58,237,.06) 0%, transparent 100%) !important; }
      `}</style>

      {todayBirthdays.length > 0 && (
        <div className="bday-banner-today anim-up">
          <span className="bday-emoji">🎂</span>
          <div>
            <p className="bday-names-today">🎉 Happy Birthday, {todayBirthdays.map((b, i) => <span key={b.name}>{b.name}{i < todayBirthdays.length - 1 ? " & " : ""}</span>)}!</p>
            <p className="bday-sub-today">Wishing {todayBirthdays.length === 1 ? "them" : "them all"} a wonderful day 🎈</p>
          </div>
          <span className="bday-pill">Today 🎊</span>
        </div>
      )}
      {tomorrowBirthdays.length > 0 && (
        <div className="bday-banner-tomorrow anim-up">
          <span className="bday-emoji-sm">🎁</span>
          <div>
            <p className="bday-names-tomorrow">{tomorrowBirthdays.map((b, i) => <span key={b.name}>{b.name}{i < tomorrowBirthdays.length - 1 ? " & " : ""}</span>)}{tomorrowBirthdays.length === 1 ? "'s" : "'"} birthday is tomorrow!</p>
            <p className="bday-sub-tomorrow">Don&apos;t forget to wish them 🎈</p>
          </div>
          <span className="bday-pill-tomorrow">Tomorrow</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }} className="anim-up">
        <div>
          <h1 className="page-title" style={{ fontSize: 24 }}>Employees</h1>
          <p style={{ fontSize: 13.5, color: "var(--tx-tertiary)", marginTop: 5 }}>{employees.length} people · {allTasks.length} tasks tracked</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelected(null); setModal("add"); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add employee
        </button>
      </div>

      {loading ? (
        <div className="empty" style={{ padding: 100 }}><div className="spinner" /></div>
      ) : (
        <div className="rail-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

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

            <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1fr 1fr", gap: 16 }}>
              <div className="card anim-up d2" style={{ padding: "14px 16px" }}>
                <p className="section-title" style={{ marginBottom: 10 }}>Workforce Status</p>
                <div className="donut-wrap" style={{ width: 120, height: 120, margin: "6px auto 14px" }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: employees.length ? `conic-gradient(${gradientParts})` : "var(--hover-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "70%", height: "70%", borderRadius: "50%", background: "var(--card-bg)" }} />
                  </div>
                  <div className="donut-center"><span className="pct" style={{ fontSize: 20 }}>{employees.length}</span><span className="lbl">People</span></div>
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
                <WeeklyChart employees={employees} />
              </div>

              <div className="card anim-up d4" style={{ padding: "14px 16px" }}>
                <p className="section-title" style={{ marginBottom: 12 }}>Department Progress</p>
                {deptRows.length === 0 ? (
                  <div className="empty" style={{ padding: 20 }}><p>No task data yet</p></div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {deptRows.map((row, i) => (
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

            <div className="card anim-up" style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <p className="section-title" style={{ marginRight: "auto" }}>All Employees ({filteredEmployees.length})</p>
                <div className="filter-tabs-wrap">
                  {["All", "Active", "On Leave", "Inactive"].map(f => (
                    <button key={f} className={`filter-tab${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
                  ))}
                </div>
                <select className="input" value={DEPTS.includes(filter) ? filter : ""} onChange={e => setFilter(e.target.value || "All")} style={{ width: "auto", maxWidth: 150, fontSize: 12.5 }}>
                  <option value="">All departments</option>
                  {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="search-wrap" style={{ maxWidth: 200 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees…" />
                </div>
              </div>

              {filteredEmployees.length === 0 ? (
                <div className="empty" style={{ padding: 60 }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>👥</p>
                  <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>{employees.length === 0 ? "No employees yet" : "No employees match your search"}</p>
                  <p style={{ fontSize: 13 }}>{employees.length === 0 ? "Add your first team member to get started" : "Try a different search or filter"}</p>
                </div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr><th>Employee</th><th>Department</th><th>Progress</th><th>Status</th><th>Tasks</th><th>Joined</th><th></th></tr>
                      </thead>
                      <tbody>
                        {pageEmployees.map(({ e: emp, m }) => {
                          const bdayStatus = getBirthdayStatus(emp);
                          return (
                            <tr key={emp.id} className={bdayStatus === "today" ? "bday-row-highlight" : undefined} onClick={() => window.location.assign(`/dashboard/employees/${emp.id}`)}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                  <div className="avatar" style={bdayStatus === "today" ? { background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff" } : undefined}>
                                    {emp.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{emp.name}</p>
                                      {bdayStatus === "today" && <span style={{ fontSize: 13 }}>🎂</span>}
                                      {bdayStatus === "tomorrow" && <span style={{ fontSize: 12 }}>🎁</span>}
                                    </div>
                                    <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{emp.position}</p>
                                  </div>
                                </div>
                              </td>
                              <td><span className="badge badge-purple">{emp.department}</span></td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div className="mini-progress-track"><div className="mini-progress-fill" style={{ width: `${m.pct}%`, background: m.pct >= 65 ? "var(--green)" : m.pct >= 35 ? "var(--amber)" : "var(--red)" }} /></div>
                                  <span style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>{m.pct}%</span>
                                </div>
                              </td>
                              <td><span className={`badge ${S_BADGE[emp.status] || "badge-gray"}`}>{S_LABEL[emp.status] || emp.status}</span></td>
                              <td><span style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-primary)" }}>{m.done}</span><span style={{ fontSize: 12, color: "var(--tx-tertiary)" }}> / {m.total}</span></td>
                              <td style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>{formatDate(emp.joinedAt)}</td>
                              <td onClick={e => e.stopPropagation()}>
                                <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                                  <Link href={`/dashboard/employees/${emp.id}/attendance`} className="btn-ghost btn-icon" title="Attendance">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                  </Link>
                                  <button className="btn-ghost btn-icon" title="Edit" onClick={() => { setSelected(emp); setModal("edit"); }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  </button>
                                  <button className="btn-ghost btn-icon" title="Delete" onClick={() => { setSelected(emp); setModal("delete"); }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
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
                      <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{t.empName}</p>
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

            <div className="promo-ribbon anim-up">
              <div className="item"><span className="ico">👥</span><span className="txt"><p className="t">One Team, One View</p><p className="s">Track workload across every department</p></span></div>
              <div className="item"><span className="ico">⚡</span><span className="txt"><p className="t">Stay on Top of Deadlines</p><p className="s">Never miss a task or milestone</p></span></div>
              <div className="item"><span className="ico">📈</span><span className="txt"><p className="t">Data-Driven Decisions</p><p className="s">See performance trends at a glance</p></span></div>
              <div className="item"><span className="ico">🚀</span><span className="txt"><p className="t">Built for Growing Teams</p><p className="s">Scale without losing visibility</p></span></div>
            </div>
          </div>

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
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--tx-secondary)" }}><span className="dot" style={{ background: color as string }} />{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-primary)" }}>{val as number}</span>
                </div>
              ))}
            </div>

            <div className="rail-card anim-up">
              <p className="section-title" style={{ marginBottom: 12 }}>Quick Actions</p>
              <button className="rail-action-btn" onClick={() => { setSelected(null); setModal("add"); }}>
                <span className="rail-action-icon" style={{ background: "var(--purple-bg)" }}>👤</span>New Employee
              </button>
              <Link href="/dashboard/tasks" className="rail-action-btn">
                <span className="rail-action-icon" style={{ background: "var(--blue-bg)" }}>✅</span>View All Tasks
              </Link>
              <Link href="/dashboard/performance" className="rail-action-btn">
                <span className="rail-action-icon" style={{ background: "var(--green-bg)" }}>📊</span>View Reports
              </Link>
              <button className="rail-action-btn" onClick={fetchEmployees} style={{ marginBottom: 0 }}>
                <span className="rail-action-icon" style={{ background: "var(--amber-bg)" }}>🔄</span>Refresh Data
              </button>
            </div>
          </div>
        </div>
      )}

      {(modal==="add"||modal==="edit") && <Modal emp={modal==="edit"?selected:null} onClose={()=>setModal(null)} onSave={fetchEmployees}/>}
      {modal==="delete" && selected && <DeleteModal emp={selected} onClose={()=>setModal(null)} onDelete={fetchEmployees}/>}
    </div>
  );
}
