export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

async function getData() {
  const [empTotal, empActive, taskTotal, taskDone, taskPending, taskActive, clientTotal, recentEmps, recentTasks] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "COMPLETED" } }),
    prisma.task.count({ where: { status: "PENDING" } }),
    prisma.task.count({ where: { status: "IN_PROGRESS" } }),
    prisma.client.count(),
    prisma.employee.findMany({ include: { tasks: { select: { status: true } }, clientTasks: { select: { status: true } } }, orderBy: { createdAt: "desc" }, take: 7 }),
    prisma.task.findMany({ include: { employee: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  return { empTotal, empActive, taskTotal, taskDone, taskPending, taskActive, clientTotal, recentEmps, recentTasks };
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-gray", IN_PROGRESS: "badge-blue", COMPLETED: "badge-green", OVERDUE: "badge-red",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending", IN_PROGRESS: "In progress", COMPLETED: "Done", OVERDUE: "Overdue",
};

// Employee birthdays (DD/MM/YYYY)
const EMPLOYEE_BIRTHDAYS: { name: string; dob: string }[] = [
  { name: "Simran Singh",          dob: "17/10/2001" },
  { name: "Ayan Pakhira",          dob: "19/07/1995" },
  { name: "Ashutosh Bhaskar",      dob: "31/03/1997" },
  { name: "Arindam Biswas",        dob: "28/10/2003" },
  { name: "Ritik Singh",           dob: "20/08/2001" },
  { name: "Riya Kashyap",          dob: "09/05/1999" },
  { name: "Ashlesha Kadwey",       dob: "15/06/2002" },
  { name: "Pankaj Chandrawanshi",  dob: "25/01/2000" },
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

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const d   = await getData();
  const rate = d.taskTotal > 0 ? Math.round((d.taskDone / d.taskTotal) * 100) : 0;

  const now            = new Date();
  const birthdayAlerts = getBirthdayAlerts(now);
  const todayBirthdays    = birthdayAlerts.filter(b => b.isToday);
  const tomorrowBirthdays = birthdayAlerts.filter(b => b.isTomorrow);

  return (
    <div className="page-section">

      {/* ── Birthday Banners ─────────────────────────────────────────── */}
      <style>{`
        @keyframes bday-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes bday-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-3px); }
        }
        .bday-banner-today {
          position: relative;
          overflow: hidden;
          border-radius: 14px;
          margin-bottom: 18px;
          padding: 18px 22px;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 80%, #f97316 100%);
          box-shadow: 0 4px 24px 0 rgba(124,58,237,.35);
          display: flex;
          align-items: center;
          gap: 16px;
          animation: bday-float 3s ease-in-out infinite;
        }
        .bday-banner-today::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.18) 50%, transparent 100%);
          background-size: 400px 100%;
          animation: bday-shimmer 2.4s linear infinite;
          pointer-events: none;
        }
        .bday-banner-tomorrow {
          border-radius: 14px;
          margin-bottom: 18px;
          padding: 14px 20px;
          background: linear-gradient(135deg, rgba(99,102,241,.12) 0%, rgba(168,85,247,.10) 100%);
          border: 1.5px solid rgba(124,58,237,.30);
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .bday-emoji {
          font-size: 30px;
          flex-shrink: 0;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,.18));
        }
        .bday-emoji-sm {
          font-size: 22px;
          flex-shrink: 0;
        }
        .bday-names-today {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          line-height: 1.4;
        }
        .bday-sub-today {
          font-size: 12px;
          color: rgba(255,255,255,.78);
          margin-top: 2px;
        }
        .bday-names-tomorrow {
          font-size: 14px;
          font-weight: 600;
          color: var(--tx-primary);
          line-height: 1.4;
        }
        .bday-sub-tomorrow {
          font-size: 12px;
          color: var(--tx-tertiary);
          margin-top: 2px;
        }
        .bday-pill {
          margin-left: auto;
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 20px;
          background: rgba(255,255,255,.22);
          color: #fff;
        }
        .bday-pill-tomorrow {
          margin-left: auto;
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .04em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 20px;
          background: rgba(124,58,237,.14);
          color: var(--accent);
        }
      `}</style>

      {todayBirthdays.length > 0 && (
        <div className="bday-banner-today anim-up">
          <span className="bday-emoji">🎂</span>
          <div>
            <p className="bday-names-today">
              🎉 Happy Birthday,{" "}
              {todayBirthdays.map((b, i) => (
                <span key={b.name}>
                  {b.name}{i < todayBirthdays.length - 1 ? " & " : ""}
                </span>
              ))}
              !
            </p>
            <p className="bday-sub-today">
              Wishing {todayBirthdays.length === 1 ? "them" : "them all"} a wonderful day 🎈
            </p>
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
                <span key={b.name}>
                  {b.name}{i < tomorrowBirthdays.length - 1 ? " & " : ""}
                </span>
              ))}
              {tomorrowBirthdays.length === 1 ? "'s" : "'"} birthday is tomorrow!
            </p>
            <p className="bday-sub-tomorrow">Don't forget to wish them 🎈</p>
          </div>
          <span className="bday-pill-tomorrow">Tomorrow</span>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }} className="anim-up">
        <p style={{ fontSize: 13, color: "var(--tx-tertiary)", marginBottom: 4 }}>
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="page-title">Good day, {session.name} 👋</h1>
        <p style={{ fontSize: 14, color: "var(--tx-secondary)", marginTop: 6 }}>Here's what's happening in your workspace today.</p>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Employees", val: d.empTotal,    sub: `${d.empActive} active`,    emoji: "👥", delay: "d1" },
          { label: "Clients",   val: d.clientTotal, sub: "total",                    emoji: "🤝", delay: "d2" },
          { label: "Tasks",     val: d.taskTotal,   sub: `${rate}% complete`,        emoji: "✅", delay: "d3" },
          { label: "Completed", val: d.taskDone,    sub: `${d.taskActive} active`,   emoji: "🎯", delay: "d4" },
        ].map(({ label, val, sub, emoji, delay }) => (
          <div key={label} className={`stat-card anim-up ${delay}`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p className="label-text">{label}</p>
              <span style={{ fontSize: 18 }}>{emoji}</span>
            </div>
            <p className="stat-value">{val}</p>
            <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 6 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Progress card ────────────────────────────────────────────── */}
      <div className="card anim-up d3" style={{ padding: "16px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--tx-primary)" }}>Task completion rate</p>
            <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 2 }}>{d.taskDone} of {d.taskTotal} tasks completed</p>
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>{rate}%</p>
        </div>
        <div className="progress-track" style={{ height: 6 }}>
          <div className="progress-fill" style={{ width: `${rate}%` }} />
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
          {[["Done", d.taskDone, "var(--green)"], ["Active", d.taskActive, "var(--blue)"], ["Pending", d.taskPending, "var(--tx-tertiary)"]].map(([l, v, c]) => (
            <div key={l as string} style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <div className="dot" style={{ background: c as string }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-primary)" }}>{v}</span>
              <span style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two column tables ────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Recent Employees */}
        <div className="card anim-up d3" style={{ overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="section-title">Recent Employees</p>
            <Link href="/dashboard/employees" style={{ fontSize: 12.5, color: "var(--tx-tertiary)", textDecoration: "none", transition: "color .12s" }}>
              View all →
            </Link>
          </div>
          <style>{`.emp-row:hover{background:var(--hover-bg)}`}</style>
          {d.recentEmps.length === 0 ? (
            <div className="empty"><p>No employees yet</p></div>
          ) : d.recentEmps.map(emp => {
            const done  = [...emp.tasks, ...emp.clientTasks].filter(t => t.status === "COMPLETED").length;
            const total = emp.tasks.length + emp.clientTasks.length;

            // Check if this employee has a birthday today or tomorrow
            const bdayEntry = birthdayAlerts.find(b => b.name === emp.name);

            return (
              <Link key={emp.id} href={`/dashboard/employees/${emp.id}`} className="emp-row"
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 18px", textDecoration: "none", borderBottom: "1px solid var(--border)", transition: "background .08s" }}>
                <div className="avatar" style={bdayEntry?.isToday ? { background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff" } : undefined}>
                  {emp.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {emp.name}
                    {bdayEntry?.isToday    && <span style={{ marginLeft: 6, fontSize: 14 }}>🎂</span>}
                    {bdayEntry?.isTomorrow && <span style={{ marginLeft: 6, fontSize: 13 }}>🎁</span>}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>{emp.position}</p>
                </div>
                <p style={{ fontSize: 12, color: "var(--tx-tertiary)", flexShrink: 0, whiteSpace: "nowrap" }}>{done}/{total} done</p>
              </Link>
            );
          })}
        </div>

        {/* Recent Tasks */}
        <div className="card anim-up d4" style={{ overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="section-title">Recent Tasks</p>
            <Link href="/dashboard/tasks" style={{ fontSize: 12.5, color: "var(--tx-tertiary)", textDecoration: "none" }}>View all →</Link>
          </div>
          {d.recentTasks.length === 0 ? (
            <div className="empty"><p>No tasks yet</p></div>
          ) : d.recentTasks.map(task => (
            <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 18px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, color: task.status === "COMPLETED" ? "var(--tx-tertiary)" : "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: task.status === "COMPLETED" ? "line-through" : "none" }}>
                  {task.title}
                </p>
                <p style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>{task.employee.name} · due {formatDate(task.endDate)}</p>
              </div>
              <span className={`badge ${STATUS_BADGE[task.status] || "badge-gray"}`}>{STATUS_LABEL[task.status] || task.status}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}