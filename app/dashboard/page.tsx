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

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const d = await getData();
  const rate = d.taskTotal > 0 ? Math.round((d.taskDone / d.taskTotal) * 100) : 0;

  return (
    <div className="page-section">
      {/* Header */}
      <div style={{ marginBottom: 32 }} className="anim-up">
        <p style={{ fontSize: 13, color: "var(--tx-tertiary)", marginBottom: 4 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="page-title">Good day, {session.name} 👋</h1>
        <p style={{ fontSize: 14, color: "var(--tx-secondary)", marginTop: 6 }}>Here's what's happening in your workspace today.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Employees", val: d.empTotal, sub: `${d.empActive} active`, emoji: "👥", delay: "d1" },
          { label: "Clients",   val: d.clientTotal, sub: "total",             emoji: "🤝", delay: "d2" },
          { label: "Tasks",     val: d.taskTotal, sub: `${rate}% complete`,   emoji: "✅", delay: "d3" },
          { label: "Completed", val: d.taskDone, sub: `${d.taskActive} active`, emoji: "🎯", delay: "d4" },
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

      {/* Progress card */}
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

      {/* Two column tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Recent Employees */}
        <div className="card anim-up d3" style={{ overflow: "hidden" }}>
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="section-title">Recent Employees</p>
            <Link href="/dashboard/employees" style={{ fontSize: 12.5, color: "var(--tx-tertiary)", textDecoration: "none", transition: "color .12s" }}
              onMouseEnter={undefined}>View all →</Link>
          </div>
          <style>{`.emp-row:hover{background:var(--hover-bg)}`}</style>
          {d.recentEmps.length === 0 ? (
            <div className="empty"><p>No employees yet</p></div>
          ) : d.recentEmps.map(emp => {
            const done = [...emp.tasks, ...emp.clientTasks].filter(t => t.status === "COMPLETED").length;
            const total = emp.tasks.length + emp.clientTasks.length;
            return (
              <Link key={emp.id} href={`/dashboard/employees/${emp.id}`} className="emp-row"
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 18px", textDecoration: "none", borderBottom: "1px solid var(--border)", transition: "background .08s" }}>
                <div className="avatar">{emp.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.name}</p>
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
