export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

// Employee birthdays (DD/MM/YYYY)
const EMPLOYEE_BIRTHDAYS: { name: string; dob: string }[] = [
 
  { name: "Ayan Pakhira",          dob: "19/07/1995" },
  { name: "Ashutosh Bhaskar",      dob: "31/03/1997" },
  { name: "Arindam Biswas",        dob: "28/10/2003" },
  { name: "Ritik Singh",           dob: "16/09/2001" },
  { name: "Riya Kashyap",          dob: "09/05/1999" },
  { name: "Ashlesha Kadwey",       dob: "15/06/2002" },
  { name: "Pankaj Chandrawanshi",  dob: "25/01/2000" },
  { name: "Rahman Khan",           dob: "24/01/1999" },
];

type BirthdayEntry = { name: string; isToday: boolean; isTomorrow: boolean };

function getBirthdayAlerts(now: Date): BirthdayEntry[] {
  const todayMonth = now.getMonth() + 1;
  const todayDay   = now.getDate();

  const tomorrow   = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowMonth = tomorrow.getMonth() + 1;
  const tomorrowDay   = tomorrow.getDate();

  const alerts: BirthdayEntry[] = [];

  for (const emp of EMPLOYEE_BIRTHDAYS) {
    const [dd, mm] = emp.dob.split("/").map(Number);
    const isToday    = mm === todayMonth    && dd === todayDay;
    const isTomorrow = mm === tomorrowMonth && dd === tomorrowDay;
    if (isToday || isTomorrow) {
      alerts.push({ name: emp.name, isToday, isTomorrow });
    }
  }

  return alerts;
}

async function getData() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
  const in3Days = new Date(startOfToday.getTime() + 4 * 24 * 60 * 60 * 1000);

  const [
    empTotal, empActive, employees,
    clientTotal, clients,
    taskTotal, taskDone, taskPending, taskActive,
    ctTotal, ctDone, ctPending, ctActive,
    overdueTaskCount, overdueClientTaskCount,
    tasksToday, clientTasksToday,
    overdueTasks, overdueClientTasks,
    upcomingTasks, upcomingClientTasks,
    recentEmps, recentClients, recentTasks,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.employee.findMany({ select: { id: true, name: true, department: true, tasks: { select: { status: true } }, clientTasks: { select: { status: true } } } }),
    prisma.client.count(),
    prisma.client.findMany({ include: { clientTasks: { select: { status: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "COMPLETED" } }),
    prisma.task.count({ where: { status: "PENDING" } }),
    prisma.task.count({ where: { status: "IN_PROGRESS" } }),
    prisma.clientTask.count(),
    prisma.clientTask.count({ where: { status: "COMPLETED" } }),
    prisma.clientTask.count({ where: { status: "PENDING" } }),
    prisma.clientTask.count({ where: { status: "IN_PROGRESS" } }),
    prisma.task.count({ where: { endDate: { lt: startOfToday }, status: { not: "COMPLETED" } } }),
    prisma.clientTask.count({ where: { endDate: { lt: startOfToday }, status: { not: "COMPLETED" } } }),
    prisma.task.findMany({ where: { endDate: { gte: startOfToday, lte: endOfToday }, status: { not: "COMPLETED" } }, include: { employee: { select: { name: true } } }, orderBy: { endDate: "asc" }, take: 6 }),
    prisma.clientTask.findMany({ where: { endDate: { gte: startOfToday, lte: endOfToday }, status: { not: "COMPLETED" } }, include: { client: { select: { name: true } } }, orderBy: { endDate: "asc" }, take: 6 }),
    prisma.task.findMany({ where: { endDate: { lt: startOfToday }, status: { not: "COMPLETED" } }, include: { employee: { select: { name: true } } }, orderBy: { endDate: "asc" }, take: 4 }),
    prisma.clientTask.findMany({ where: { endDate: { lt: startOfToday }, status: { not: "COMPLETED" } }, include: { client: { select: { name: true } } }, orderBy: { endDate: "asc" }, take: 4 }),
    prisma.task.findMany({ where: { endDate: { gt: endOfToday, lte: in3Days }, status: { not: "COMPLETED" } }, include: { employee: { select: { name: true } } }, orderBy: { endDate: "asc" }, take: 3 }),
    prisma.clientTask.findMany({ where: { endDate: { gt: endOfToday, lte: in3Days }, status: { not: "COMPLETED" } }, include: { client: { select: { name: true } } }, orderBy: { endDate: "asc" }, take: 3 }),
    prisma.employee.findMany({ orderBy: { createdAt: "desc" }, take: 3, select: { id: true, name: true, createdAt: true } }),
    prisma.client.findMany({ orderBy: { createdAt: "desc" }, take: 3, select: { id: true, name: true, createdAt: true } }),
    prisma.task.findMany({ orderBy: { createdAt: "desc" }, take: 4, include: { employee: { select: { name: true } } } }),
  ]);

  return {
    now, empTotal, empActive, employees, clientTotal, clients,
    taskTotal, taskDone, taskPending, taskActive, ctTotal, ctDone, ctPending, ctActive,
    overdueTaskCount, overdueClientTaskCount,
    tasksToday, clientTasksToday, overdueTasks, overdueClientTasks,
    upcomingTasks, upcomingClientTasks, recentEmps, recentClients, recentTasks,
  };
}

const DEPT_COLORS: Record<string, string> = {
  Engineering: "#7c3aed", Design: "#ec4899", Marketing: "#2383E2",
  Sales: "#0F9D58", HR: "#D97706", Finance: "#0891b2", Operations: "#db2777",
};
function deptColor(name: string, i: number) {
  return DEPT_COLORS[name] || ["#7c3aed", "#2383E2", "#0F9D58", "#D97706", "#E11D48", "#0891b2"][i % 6];
}

function healthFor(rate: number, total: number): { cls: string; label: string } {
  if (total === 0) return { cls: "badge-gray", label: "New" };
  if (rate >= 90) return { cls: "health-excellent", label: "Excellent" };
  if (rate >= 65) return { cls: "health-good", label: "Good" };
  if (rate >= 35) return { cls: "health-attention", label: "Needs Attention" };
  return { cls: "health-critical", label: "Critical" };
}

function timeAgo(date: Date, now: Date): string {
  const diffMs = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function dueLabel(date: Date, now: Date): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date);
  const diffDays = Math.round((new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime() - start.getTime()) / 86400000);
  if (diffDays === 0) return "Due Today";
  if (diffDays === 1) return "Due Tomorrow";
  if (diffDays === -1) return "1 day ago";
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  return `In ${diffDays} days`;
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const d = await getData();
  const { now } = d;
  const birthdayAlerts = getBirthdayAlerts(now);
  const todayBirthdays = birthdayAlerts.filter(b => b.isToday);
  const tomorrowBirthdays = birthdayAlerts.filter(b => b.isTomorrow);

  const allTaskTotal = d.taskTotal + d.ctTotal;
  const allTaskDone = d.taskDone + d.ctDone;
  const rate = allTaskTotal > 0 ? Math.round((allTaskDone / allTaskTotal) * 100) : 0;

  // Department progress
  const deptMap = new Map<string, { done: number; total: number }>();
  for (const e of d.employees) {
    const all = [...e.tasks, ...e.clientTasks];
    const cur = deptMap.get(e.department) || { done: 0, total: 0 };
    cur.done += all.filter(t => t.status === "COMPLETED").length;
    cur.total += all.length;
    deptMap.set(e.department, cur);
  }
  const deptRows = Array.from(deptMap.entries())
    .map(([name, v]) => ({ name, pct: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0, total: v.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // Client overview
  const clientRows = d.clients
    .map(c => {
      const done = c.clientTasks.filter(t => t.status === "COMPLETED").length;
      const total = c.clientTasks.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { id: c.id, name: c.name, pct, total, health: healthFor(pct, total) };
    })
    .sort((a, b) => b.total - a.total);

  // Client health distribution (for donut)
  const healthCounts = { Excellent: 0, Good: 0, "Needs Attention": 0, Critical: 0 };
  for (const c of clientRows) {
    if (c.health.label === "New") continue;
    healthCounts[c.health.label as keyof typeof healthCounts]++;
  }
  const healthyClients = healthCounts.Excellent + healthCounts.Good;
  const ratedClients = healthyClients + healthCounts["Needs Attention"] + healthCounts.Critical;
  const healthPct = ratedClients > 0 ? Math.round((healthyClients / ratedClients) * 100) : 0;

  // Tasks today (merged)
  const tasksToday = [
    ...d.tasksToday.map(t => ({ id: t.id, title: t.title, who: t.employee.name, tag: "Team" })),
    ...d.clientTasksToday.map(t => ({ id: t.id, title: t.title, who: t.client.name, tag: "Client" })),
  ].slice(0, 6);

  // Overdue + upcoming
  const overdue = [
    ...d.overdueTasks.map(t => ({ id: t.id, title: t.title, who: t.employee.name, endDate: t.endDate })),
    ...d.overdueClientTasks.map(t => ({ id: t.id, title: t.title, who: t.client.name, endDate: t.endDate })),
  ].sort((a, b) => a.endDate.getTime() - b.endDate.getTime()).slice(0, 4);

  const upcoming = [
    ...d.upcomingTasks.map(t => ({ id: t.id, title: t.title, who: t.employee.name, endDate: t.endDate })),
    ...d.upcomingClientTasks.map(t => ({ id: t.id, title: t.title, who: t.client.name, endDate: t.endDate })),
  ].sort((a, b) => a.endDate.getTime() - b.endDate.getTime()).slice(0, 4);

  // Recent activity
  const activity = [
    ...d.recentEmps.map(e => ({ id: e.id, icon: "👤", text: `New employee added — ${e.name}`, at: e.createdAt })),
    ...d.recentClients.map(c => ({ id: c.id, icon: "🤝", text: `New client added — ${c.name}`, at: c.createdAt })),
    ...d.recentTasks.map(t => ({ id: t.id, icon: t.status === "COMPLETED" ? "✅" : "📋", text: `${t.status === "COMPLETED" ? "Task completed" : "Task assigned"} — ${t.title}`, at: t.createdAt })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 6);

  const donutDeg = Math.max(0, Math.min(360, Math.round((rate / 100) * 360)));

  const STAT_CARDS = [
    { label: "Total Employees", val: d.empTotal, sub: `${d.empActive} active`, color: "#7c3aed", bg: "var(--purple-bg)", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
    ) },
    { label: "Total Clients", val: d.clientTotal, sub: "in workspace", color: "#2383E2", bg: "var(--blue-bg)", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2383E2" strokeWidth="2"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.77-.77-.77a5.4 5.4 0 1 0-7.65 7.65l.77.77L12 20.66l7.65-7.66.77-.77a5.4 5.4 0 0 0 0-7.65z"/></svg>
    ) },
    { label: "Completed Tasks", val: allTaskDone, sub: `${rate}% of all tasks`, color: "#0F9D58", bg: "var(--green-bg)", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F9D58" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    ) },
    { label: "Pending Tasks", val: d.taskPending + d.ctPending, sub: `${d.taskActive + d.ctActive} in progress`, color: "#D97706", bg: "var(--amber-bg)", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ) },
    { label: "Overdue Tasks", val: d.overdueTaskCount + d.overdueClientTaskCount, sub: "need attention", color: "#E11D48", bg: "var(--red-bg)", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    ) },
    { label: "Client Health (Avg)", val: `${healthPct}%`, sub: "clients in good standing", color: "#7c3aed", bg: "var(--purple-bg)", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    ) },
  ];

  return (
    <div className="page-section" style={{ paddingBottom: 90 }}>

      {/* ── Birthday banners ─────────────────────────────────────────── */}
      <style>{`
        @keyframes bday-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes bday-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-3px); } }
        .bday-banner-today {
          position: relative; overflow: hidden; border-radius: 14px; margin-bottom: 18px;
          padding: 18px 22px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 80%, #f97316 100%);
          box-shadow: 0 4px 24px 0 rgba(124,58,237,.35);
          display: flex; align-items: center; gap: 16px; animation: bday-float 3s ease-in-out infinite;
        }
        .bday-banner-today::before {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.18) 50%, transparent 100%);
          background-size: 400px 100%; animation: bday-shimmer 2.4s linear infinite; pointer-events: none;
        }
        .bday-banner-tomorrow {
          border-radius: 14px; margin-bottom: 18px; padding: 14px 20px;
          background: linear-gradient(135deg, rgba(124,58,237,.12) 0%, rgba(168,85,247,.10) 100%);
          border: 1.5px solid rgba(124,58,237,.30); display: flex; align-items: center; gap: 14px;
        }
        .bday-emoji { font-size: 30px; flex-shrink: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,.18)); }
        .bday-emoji-sm { font-size: 22px; flex-shrink: 0; }
        .bday-names-today { font-size: 15px; font-weight: 700; color: #fff; line-height: 1.4; }
        .bday-sub-today { font-size: 12px; color: rgba(255,255,255,.78); margin-top: 2px; }
        .bday-names-tomorrow { font-size: 14px; font-weight: 600; color: var(--tx-primary); line-height: 1.4; }
        .bday-sub-tomorrow { font-size: 12px; color: var(--tx-tertiary); margin-top: 2px; }
        .bday-pill {
          margin-left: auto; flex-shrink: 0; font-size: 11px; font-weight: 700; letter-spacing: .04em;
          text-transform: uppercase; padding: 4px 10px; border-radius: 20px; background: rgba(255,255,255,.22); color: #fff;
        }
        .bday-pill-tomorrow {
          margin-left: auto; flex-shrink: 0; font-size: 11px; font-weight: 600; letter-spacing: .04em;
          text-transform: uppercase; padding: 4px 10px; border-radius: 20px; background: rgba(124,58,237,.14); color: var(--accent);
        }
      `}</style>

      {todayBirthdays.length > 0 && (
        <div className="bday-banner-today anim-up">
          <span className="bday-emoji">🎂</span>
          <div>
            <p className="bday-names-today">
              🎉 Happy Birthday,{" "}
              {todayBirthdays.map((b, i) => (
                <span key={b.name}>{b.name}{i < todayBirthdays.length - 1 ? " & " : ""}</span>
              ))}!
            </p>
            <p className="bday-sub-today">Wishing {todayBirthdays.length === 1 ? "them" : "them all"} a wonderful day 🎈</p>
          </div>
          <span className="bday-pill">Today 🎊</span>
        </div>
      )}

      {tomorrowBirthdays.length > 0 && (
        <div className="bday-banner-tomorrow anim-up">
          <span className="bday-emoji-sm">🎁</span>
          <div>
            <p className="bday-names-tomorrow">
              {tomorrowBirthdays.map((b, i) => (
                <span key={b.name}>{b.name}{i < tomorrowBirthdays.length - 1 ? " & " : ""}</span>
              ))}
              {tomorrowBirthdays.length === 1 ? "'s" : "'"} birthday is tomorrow!
            </p>
            <p className="bday-sub-tomorrow">Don&apos;t forget to wish them 🎈</p>
          </div>
          <span className="bday-pill-tomorrow">Tomorrow</span>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 26 }} className="anim-up">
        <p style={{ fontSize: 13, color: "var(--tx-tertiary)", marginBottom: 4 }}>
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="page-title">Good day, {session.name} 👋</h1>
        <p style={{ fontSize: 14, color: "var(--tx-secondary)", marginTop: 6 }}>Here&apos;s what&apos;s happening in your workspace today.</p>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} className={`stat-card anim-up d${(i % 4) + 1}`} style={{ padding: "16px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p className="label-text" style={{ fontSize: 10 }}>{s.label}</p>
              <div className="icon-chip" style={{ background: s.bg, width: 30, height: 30 }}>{s.icon}</div>
            </div>
            <p className="stat-value" style={{ fontSize: 24 }}>{s.val}</p>
            <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 5 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Row 2: Client overview / Tasks today / Department progress ─ */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Client Overview */}
        <div className="card anim-up d2" style={{ overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="section-title">Client Overview</p>
            <Link href="/dashboard/clients" style={{ fontSize: 12.5, color: "var(--tx-tertiary)", textDecoration: "none" }}>View all →</Link>
          </div>
          {clientRows.length === 0 ? (
            <div className="empty"><p>No clients yet</p></div>
          ) : clientRows.slice(0, 6).map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
              </div>
              <div className="mini-progress-track">
                <div className="mini-progress-fill" style={{ width: `${c.pct}%`, background: c.pct >= 65 ? "var(--green)" : c.pct >= 35 ? "var(--amber)" : "var(--red)" }} />
              </div>
              <span className={`health-badge ${c.health.cls}`} style={{ flexShrink: 0, minWidth: 78, justifyContent: "center" }}>{c.health.label}</span>
              <span style={{ fontSize: 12, color: "var(--tx-tertiary)", flexShrink: 0, width: 20, textAlign: "right" }}>{c.total}</span>
            </div>
          ))}
        </div>

        {/* Tasks Today */}
        <div className="card anim-up d3" style={{ overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="section-title">Tasks Today</p>
            <Link href="/dashboard/tasks" style={{ fontSize: 12.5, color: "var(--tx-tertiary)", textDecoration: "none" }}>All tasks →</Link>
          </div>
          {tasksToday.length === 0 ? (
            <div className="empty" style={{ padding: 36 }}><p>Nothing due today 🎉</p></div>
          ) : tasksToday.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ width: 15, height: 15, borderRadius: 4, border: "1.5px solid var(--border-md)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{t.who} · {t.tag}</p>
              </div>
              <span className="badge badge-amber" style={{ flexShrink: 0, fontSize: 10.5 }}>Due Today</span>
            </div>
          ))}
        </div>

        {/* Department Progress */}
        <div className="card anim-up d4" style={{ padding: "13px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p className="section-title">Department Progress</p>
            <span style={{ fontSize: 12.5, color: "var(--tx-tertiary)" }}>{deptRows.length} depts</span>
          </div>
          {deptRows.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}><p>No data yet</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {deptRows.map((row, i) => (
                <div key={row.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, color: "var(--tx-secondary)" }}>{row.name}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--tx-primary)" }}>{row.pct}%</span>
                  </div>
                  <div className="dept-bar-track">
                    <div className="dept-bar-fill" style={{ width: `${row.pct}%`, background: deptColor(row.name, i) }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Client health donut / Upcoming & overdue / Recent activity ─ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr 1.1fr", gap: 16, marginBottom: 16 }}>

        {/* Client health donut */}
        <div className="card anim-up d2" style={{ padding: "13px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p className="section-title">Client Health</p>
          </div>
          <div className="donut-wrap" style={{ margin: "10px auto 16px" }}>
            <div style={{
              width: "100%", height: "100%", borderRadius: "50%",
              background: `conic-gradient(#7c3aed ${donutDeg}deg, var(--hover-bg) ${donutDeg}deg)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: "72%", height: "72%", borderRadius: "50%", background: "var(--card-bg)" }} />
            </div>
            <div className="donut-center">
              <span className="pct">{healthPct}%</span>
              <span className="lbl">Healthy</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              ["Excellent", healthCounts.Excellent, "var(--green)"],
              ["Good", healthCounts.Good, "var(--blue)"],
              ["Needs Attention", healthCounts["Needs Attention"], "var(--amber)"],
              ["Critical", healthCounts.Critical, "var(--red)"],
            ].map(([label, count, color]) => (
              <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span className="dot" style={{ background: color as string }} />
                <span style={{ fontSize: 12.5, color: "var(--tx-secondary)", flex: 1 }}>{label}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--tx-primary)" }}>{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming & Overdue */}
        <div className="card anim-up d3" style={{ overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
            <p className="section-title">Upcoming &amp; Overdue</p>
          </div>
          {overdue.length === 0 && upcoming.length === 0 ? (
            <div className="empty" style={{ padding: 36 }}><p>All caught up 🎉</p></div>
          ) : (
            <>
              {overdue.length > 0 && (
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--red)", padding: "10px 18px 4px" }}>Overdue ({overdue.length})</p>
              )}
              {overdue.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 18px" }}>
                  <span className="dot" style={{ background: "var(--red)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                    <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{t.who}</p>
                  </div>
                  <span style={{ fontSize: 11.5, color: "var(--red)", flexShrink: 0, fontWeight: 500 }}>{dueLabel(t.endDate, now)}</span>
                </div>
              ))}
              {upcoming.length > 0 && (
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--tx-tertiary)", padding: "12px 18px 4px" }}>Upcoming ({upcoming.length})</p>
              )}
              {upcoming.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 18px" }}>
                  <span className="dot" style={{ background: "var(--accent)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                    <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{t.who}</p>
                  </div>
                  <span style={{ fontSize: 11.5, color: "var(--tx-tertiary)", flexShrink: 0 }}>{dueLabel(t.endDate, now)}</span>
                </div>
              ))}
              <div style={{ height: 6 }} />
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card anim-up d4" style={{ overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
            <p className="section-title">Recent Activity</p>
          </div>
          {activity.length === 0 ? (
            <div className="empty" style={{ padding: 36 }}><p>No recent activity</p></div>
          ) : activity.map(a => (
            <div key={`${a.icon}-${a.id}`} className="activity-row" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="activity-icon">{a.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, color: "var(--tx-primary)", lineHeight: 1.4 }}>{a.text}</p>
                <p style={{ fontSize: 11, color: "var(--tx-tertiary)", marginTop: 2 }}>{timeAgo(a.at, now)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick links ──────────────────────────────────────────────── */}
      <div className="card anim-up" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--tx-tertiary)", marginRight: 4 }}>Quick links:</span>
        <Link href="/dashboard/employees" className="quicklink-btn">👥 New Employee</Link>
        <Link href="/dashboard/clients" className="quicklink-btn">🤝 New Client</Link>
        <Link href="/dashboard/tasks" className="quicklink-btn">✅ New Task</Link>
        <Link href="/dashboard/performance" className="quicklink-btn">📊 View Reports</Link>
      </div>

      {/* ── Floating assistance CTA ──────────────────────────────────── */}
      <div className="assist-cta">
        <div style={{ flex: 1 }}>
          <p className="title">Need Assistance?</p>
          <p className="sub">Our team is always here to help</p>
        </div>
        <button>Chat Now</button>
      </div>
    </div>
  );
}
