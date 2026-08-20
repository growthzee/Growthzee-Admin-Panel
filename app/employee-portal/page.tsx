"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import TaskCategoryBadge from "@/components/TaskCategoryBadge";
import { LEAVE_REASONS, LEAVE_STATUS_BADGE, LEAVE_STATUS_LABEL, reasonEmoji, reasonLabel } from "@/lib/leave";
import { WORK_LINK_TYPES, detectLinkType, hostOf, isValidUrl, linkTypeEmoji, linkTypeLabel } from "@/lib/workLinks";

type LeaveRequest = {
  id: string; reason: string; startDate: string; endDate: string; days: number;
  note?: string | null; status: string; reviewNote?: string | null;
  reviewedBy?: string | null; reviewedAt?: string | null; createdAt: string;
};

type WorkLink = {
  id: string; title: string; url: string; linkType: string; note?: string | null; createdAt: string;
  client: { id: string; name: string; company?: string };
};
type ClientOption = { id: string; name: string; company?: string };

type ITask = { id: string; title: string; description?: string; category?: string | null; subCategory?: string | null; taskType?: string | null; status: string; priority: string; startDate: string; endDate: string; completedAt?: string; createdAt: string; _type: "internal" };
type CTask = { id: string; title: string; description?: string; category?: string | null; subCategory?: string | null; taskType?: string | null; status: string; priority: string; startDate: string; endDate: string; completedAt?: string; createdAt: string; _type: "client"; client: { id: string; name: string; company?: string } };
type AnyTask = ITask | CTask;
type Employee = { id: string; name: string; email: string; department: string; position: string; tasks: Omit<ITask, "_type">[]; clientTasks: Omit<CTask, "_type">[] };

const S_BADGE: Record<string, string> = { PENDING: "badge-gray", IN_PROGRESS: "badge-blue", COMPLETED: "badge-green", CHANGES_REQUIRED: "badge-amber", OVERDUE: "badge-red" };
const S_LABEL: Record<string, string> = { PENDING: "Pending", IN_PROGRESS: "In progress", COMPLETED: "Done", CHANGES_REQUIRED: "Changes needed", OVERDUE: "Overdue" };
const S_COLOR: Record<string, string> = { PENDING: "var(--amber)", IN_PROGRESS: "var(--blue)", COMPLETED: "var(--green)", CHANGES_REQUIRED: "var(--amber)", OVERDUE: "var(--red)" };
const P_COLOR: Record<string, string> = { LOW: "var(--tx-tertiary)", MEDIUM: "var(--blue)", HIGH: "var(--amber)", URGENT: "var(--red)" };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function pad(n: number) { return String(n).padStart(2, "0"); }
function dk(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function isOverdue(t: AnyTask) { return t.status !== "COMPLETED" && new Date(t.endDate) < new Date(); }
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

function Calendar({ tasks }: { tasks: AnyTask[] }) {
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sel, setSel] = useState<string | null>(null);
  const y = view.getFullYear(), m = view.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const todayKey = dk(today);

  const map: Record<string, AnyTask[]> = {};
  tasks.forEach((t) => {
    for (const d = new Date(t.startDate); d <= new Date(t.endDate); d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === y && d.getMonth() === m) {
        const k = dk(new Date(d));
        if (!map[k]) map[k] = [];
        map[k].push(t);
      }
    }
  });

  return (
    <div className="card" style={{ padding: 16, position: "sticky", top: 76 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p className="section-title">{MONTHS[m].slice(0, 3)} {y}</p>
        <div style={{ display: "flex", gap: 2 }}>
          <button className="btn-ghost btn-icon" onClick={() => { setView(new Date(y, m - 1, 1)); setSel(null); }} title="Previous month">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button className="btn-ghost btn-icon" onClick={() => { setView(new Date(y, m + 1, 1)); setSel(null); }} title="Next month">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 9.5, fontWeight: 600, letterSpacing: ".06em", color: "var(--tx-tertiary)", paddingBottom: 4 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const k = `${y}-${pad(m + 1)}-${pad(day)}`;
          const dt = map[k] || [];
          const isToday = k === todayKey;
          const isSel = k === sel;
          const hasOverdue = dt.some((t) => isOverdue(t));
          const hasActive = dt.some((t) => t.status === "IN_PROGRESS");
          const allDone = dt.length > 0 && dt.every((t) => t.status === "COMPLETED");
          const dotColor = hasOverdue ? "var(--red)" : hasActive ? "var(--blue)" : allDone ? "var(--green)" : "var(--tx-tertiary)";
          return (
            <button
              key={k}
              onClick={() => setSel(isSel ? null : k)}
              title={dt.length ? `${dt.length} task${dt.length === 1 ? "" : "s"}` : undefined}
              style={{
                position: "relative", height: 30, border: isToday ? "1.5px solid var(--accent)" : "1px solid transparent",
                borderRadius: 7, cursor: "pointer", fontSize: 11.5, fontWeight: isToday || isSel ? 700 : 500,
                transition: "background .12s, transform .12s", fontFamily: "inherit",
                background: isSel ? "var(--accent)" : dt.length > 0 ? "var(--hover-bg)" : "transparent",
                color: isSel ? "#fff" : dt.length > 0 ? "var(--tx-primary)" : "var(--tx-disabled)",
              }}
            >
              {day}
              {dt.length > 0 && (
                <span style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: isSel ? "#fff" : dotColor }} />
              )}
            </button>
          );
        })}
      </div>

      {sel && map[sel] && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <p className="label-text" style={{ marginBottom: 8 }}>
            {new Date(sel + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {map[sel].map((t) => (
              <div key={`${t._type}-${t.id}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 9px", background: "var(--hover-bg)", borderRadius: "var(--r-md)" }}>
                <span className="dot" style={{ background: isOverdue(t) ? "var(--red)" : S_COLOR[t.status] || "var(--tx-tertiary)" }} />
                <p style={{ fontSize: 11.5, color: "var(--tx-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 6 }}>
        {([["Done", "var(--green)"], ["Active", "var(--blue)"], ["Overdue", "var(--red)"]] as [string, string][]).map(([l, c]) => (
          <span key={l} className="att-legend-chip" style={{ fontSize: 10.5 }}>
            <span className="dot" style={{ background: c }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, onUpdate }: { task: AnyTask; onUpdate: (id: string, status: string, type: string) => Promise<void> }) {
  const isClient = task._type === "client";
  const [upd, setUpd] = useState(false);
  const overdue = isOverdue(task);
  const statuses = isClient ? ["PENDING", "IN_PROGRESS", "COMPLETED", "CHANGES_REQUIRED", "OVERDUE"] : ["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"];
  const done = task.status === "COMPLETED";

  async function set(s: string) { setUpd(true); await onUpdate(task.id, s, task._type); setUpd(false); }

  return (
    <div className="card" style={{ padding: "14px 16px", borderLeft: `3px solid ${overdue ? "var(--red)" : S_COLOR[task.status] || "var(--border-md)"}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <button
          onClick={() => !done && set("COMPLETED")}
          disabled={upd || done}
          title={done ? "Completed" : "Mark complete"}
          style={{
            marginTop: 2, width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
            border: done ? "none" : "1.5px solid var(--border-md)",
            background: done ? "var(--green)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: done ? "default" : "pointer", transition: "all .15s",
          }}
        >
          {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {task.category && (
            <div style={{ marginBottom: 6 }}>
              <TaskCategoryBadge category={task.category} subCategory={task.subCategory} taskType={task.taskType} compact />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <p style={{ fontSize: 13.5, fontWeight: 500, color: done ? "var(--tx-tertiary)" : "var(--tx-primary)", textDecoration: done ? "line-through" : "none" }}>
              {task.title}
            </p>
            <span className={`badge ${overdue ? "badge-red" : S_BADGE[task.status] || "badge-gray"}`}>
              {overdue ? "Overdue" : S_LABEL[task.status] || task.status}
            </span>
            {isClient && "client" in task && (
              <span className="badge badge-purple">{task.client.company || task.client.name}</span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: P_COLOR[task.priority] }}>
              <span className="dot" style={{ background: P_COLOR[task.priority] }} />{task.priority}
            </span>
          </div>

          {task.description && (
            <p style={{ fontSize: 12.5, color: "var(--tx-secondary)", marginBottom: 6, lineHeight: 1.5 }}>{task.description}</p>
          )}

          <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginBottom: 10 }}>
            {formatDate(task.startDate)} →{" "}
            <span style={{ color: overdue ? "var(--red)" : "var(--tx-tertiary)", fontWeight: overdue ? 600 : 400 }}>
              {formatDate(task.endDate)}
            </span>
            {!done && <span style={{ marginLeft: 8, color: overdue ? "var(--red)" : "var(--accent)", fontWeight: 500 }}>· {dueLabel(task.endDate)}</span>}
            {task.completedAt && <span style={{ color: "var(--green)", marginLeft: 8 }}>✓ {formatDate(task.completedAt)}</span>}
          </p>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {!done && (
              <button className="btn btn-primary btn-sm" onClick={() => set("COMPLETED")} disabled={upd}>
                {upd
                  ? <span className="spinner" style={{ width: 11, height: 11, borderTopColor: "rgba(255,255,255,0.7)" }} />
                  : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                Complete
              </button>
            )}
            {!done && task.status !== "IN_PROGRESS" && (
              <button className="btn btn-secondary btn-sm" onClick={() => set("IN_PROGRESS")} disabled={upd}>Start working</button>
            )}
            {!done && (
              <select value={task.status} onChange={(e) => set(e.target.value)} disabled={upd} className="input" style={{ width: "auto", padding: "4px 8px", fontSize: 11.5, height: "auto" }}>
                {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Local-date YYYY-MM-DD (toISOString would shift the day for +05:30 before 05:30am) */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDaysStr(dateStr: string, delta: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
function prettyDate(dateStr: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

const DURATIONS = [
  { label: "1 day", n: 1 },
  { label: "2 days", n: 2 },
  { label: "3 days", n: 3 },
  { label: "5 days", n: 5 },
  { label: "1 week", n: 7 },
  { label: "2 weeks", n: 14 },
];

function LeaveModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState<string>("SICK");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Working days (excluding Sundays) in the chosen range
  let days = 0;
  if (startDate && endDate) {
    const s = new Date(startDate + "T12:00:00");
    const e = new Date(endDate + "T12:00:00");
    if (e >= s) {
      for (const c = new Date(s); c <= e; c.setDate(c.getDate() + 1)) {
        if (c.getDay() !== 0) days++;
      }
    }
  }
  const invalidRange = !!startDate && !!endDate && new Date(endDate) < new Date(startDate);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/employee-portal/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, startDate, endDate, note }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to submit request");
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop anim-in">
      <div className="modal anim-scale" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div>
            <p className="section-title">Request leave</p>
            <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 2 }}>
              Your manager will review and approve this request
            </p>
          </div>
          <button className="btn-ghost btn-icon" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="modal-body" style={{ maxHeight: "80vh", overflowY: "auto" }}>
          {error && (
            <div style={{ padding: "9px 12px", background: "var(--red-bg)", borderRadius: "var(--r-md)", color: "var(--red)", fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="label" style={{ marginBottom: 7 }}>Reason for leave *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {LEAVE_REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className="leave-reason-btn"
                    data-active={reason === r.value}
                  >
                    <span style={{ fontSize: 14 }}>{r.emoji}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label" style={{ marginBottom: 7 }}>Leave dates *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <p className="leave-field-hint">Start date</p>
                  <input
                    className="input"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStartDate(v);
                      // Keep the range valid, but never silently shrink a longer request
                      if (v && endDate && endDate < v) setEndDate(v);
                    }}
                  />
                </div>
                <div>
                  <p className="leave-field-hint">End date</p>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input
                      className="input"
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ flex: 1, minWidth: 0 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      title="One day earlier"
                      style={{ width: 30, padding: 0, flexShrink: 0 }}
                      onClick={() => setEndDate((cur) => {
                        const next = addDaysStr(cur || startDate, -1);
                        return next < startDate ? startDate : next;
                      })}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      title="One day later"
                      style={{ width: 30, padding: 0, flexShrink: 0 }}
                      onClick={() => setEndDate((cur) => addDaysStr(cur || startDate, 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Duration shortcuts — set the end date straight from the start date */}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 9, alignItems: "center" }}>
                <span style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginRight: 2 }}>Quick duration:</span>
                {DURATIONS.map(({ label, n }) => {
                  const target = addDaysStr(startDate, n - 1);
                  return (
                    <button
                      key={label}
                      type="button"
                      className="leave-duration-btn"
                      data-active={endDate === target}
                      onClick={() => setEndDate(target)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {invalidRange ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "var(--red-bg)", borderRadius: "var(--r-md)" }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <p style={{ fontSize: 12.5, color: "var(--red)", fontWeight: 500 }}>
                  End date cannot be before the start date.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "var(--accent-bg)", borderRadius: "var(--r-md)" }}>
                <span style={{ fontSize: 14 }}>🗓️</span>
                <p style={{ fontSize: 12.5, color: "var(--accent)", fontWeight: 500 }}>
                  {prettyDate(startDate)} → {prettyDate(endDate)}
                  <span style={{ color: "var(--tx-tertiary)", fontWeight: 400 }}>
                    {" "}· {days} working day{days === 1 ? "" : "s"} (Sundays excluded)
                  </span>
                </p>
              </div>
            )}

            <div>
              <label className="label" style={{ marginBottom: 6 }}>Note for your manager</label>
              <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                style={{ minHeight: 70 }} placeholder="Anything they should know (optional)…" />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading || invalidRange || days === 0}>
                {loading && <span className="spinner" style={{ width: 13, height: 13, borderTopColor: "rgba(255,255,255,0.7)" }} />}
                {loading ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function LeavePanel({ requests, onRequest }: { requests: LeaveRequest[]; onRequest: () => void }) {
  const pending = requests.filter((r) => r.status === "PENDING").length;
  const approvedDays = requests.filter((r) => r.status === "APPROVED").reduce((s, r) => s + r.days, 0);

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ marginRight: "auto" }}>
          <p className="section-title">My leave requests</p>
          <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 2 }}>
            {approvedDays} day{approvedDays === 1 ? "" : "s"} approved{pending > 0 ? ` · ${pending} awaiting review` : ""}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onRequest}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Request leave
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="empty" style={{ padding: 40 }}>
          <p style={{ fontSize: 22, marginBottom: 6 }}>🗓️</p>
          <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>No leave requests yet</p>
          <p style={{ fontSize: 13 }}>Request time off — including future dates</p>
        </div>
      ) : requests.map((r) => (
        <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 16px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 17, marginTop: 1 }}>{reasonEmoji(r.reason)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-primary)" }}>{reasonLabel(r.reason)}</p>
              <span className={`badge ${LEAVE_STATUS_BADGE[r.status] || "badge-gray"}`}>{LEAVE_STATUS_LABEL[r.status] || r.status}</span>
              <span className="badge badge-gray">{r.days} day{r.days === 1 ? "" : "s"}</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 3 }}>
              {formatDate(r.startDate)} → {formatDate(r.endDate)}
            </p>
            {r.note && <p style={{ fontSize: 12, color: "var(--tx-secondary)", marginTop: 4 }}>“{r.note}”</p>}
            {r.status !== "PENDING" && r.reviewedBy && (
              <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 4 }}>
                {LEAVE_STATUS_LABEL[r.status]} by {r.reviewedBy}
                {r.reviewedAt ? ` on ${formatDate(r.reviewedAt)}` : ""}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Derive a readable title from a pasted URL so the field isn't left blank */
function guessTitle(url: string) {
  try {
    const u = new URL(url.trim());
    const last = u.pathname.split("/").filter(Boolean).pop() || "";
    const cleaned = decodeURIComponent(last).replace(/[-_+]/g, " ").replace(/\.[a-z0-9]{2,4}$/i, "").trim();
    // Google file IDs are long opaque strings — not useful as a title
    if (!cleaned || cleaned.length > 40 || /^[a-z0-9_-]{20,}$/i.test(cleaned)) {
      return hostOf(url).split(".")[0].replace(/^\w/, (c) => c.toUpperCase()) + " link";
    }
    return cleaned.replace(/^\w/, (c) => c.toUpperCase());
  } catch {
    return "";
  }
}

function WorkLinksPanel({ links, clients, onSubmitted }: {
  links: WorkLink[];
  clients: ClientOption[];
  onSubmitted: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [linkType, setLinkType] = useState<string>("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  // Follow the URL unless the employee has explicitly overridden the type
  const effectiveType = linkType || (url ? detectLinkType(url) : "OTHER");
  const urlLooksValid = !url || isValidUrl(url);

  // Select the first client once the list arrives
  useEffect(() => {
    if (!clientId && clients.length > 0) setClientId(clients[0].id);
  }, [clients, clientId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/employee-portal/work-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, title, url, linkType: effectiveType, note }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to submit");
      setTitle(""); setUrl(""); setNote(""); setLinkType("");
      setOk(true); setTimeout(() => setOk(false), 3000);
      onSubmitted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    await fetch(`/api/employee-portal/work-links?id=${id}`, { method: "DELETE" });
    onSubmitted();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)" }}>
          <p className="section-title">My submitted work</p>
          <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 2 }}>
            {links.length} link{links.length === 1 ? "" : "s"} shared with the team
          </p>
        </div>

        {links.length === 0 ? (
          <div className="empty" style={{ padding: 50 }}>
            <p style={{ fontSize: 22, marginBottom: 6 }}>🔗</p>
            <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>No work submitted yet</p>
            <p style={{ fontSize: 13 }}>Share a Drive, Doc, Sheet or PDF link for a client</p>
          </div>
        ) : links.map((l) => (
          <div key={l.id} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 16px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 17, marginTop: 1 }}>{linkTypeEmoji(l.linkType)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <a href={l.url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", textDecoration: "none" }}>
                  {l.title}
                </a>
                <span className="badge badge-gray">{linkTypeLabel(l.linkType)}</span>
                <span className="badge badge-purple">{l.client.company || l.client.name}</span>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {hostOf(l.url)} · submitted {formatDate(l.createdAt)}
              </p>
              {l.note && <p style={{ fontSize: 12, color: "var(--tx-secondary)", marginTop: 4 }}>{l.note}</p>}
            </div>
            <button className="btn-ghost btn-icon" title="Remove" onClick={() => remove(l.id)} style={{ flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 18 }}>
        <p className="section-title" style={{ marginBottom: 3 }}>Submit a work link</p>
        <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginBottom: 13 }}>
          Paste any Drive, Doc, Sheet, PDF or other URL
        </p>

        {error && (
          <div style={{ padding: "8px 11px", background: "var(--red-bg)", borderRadius: "var(--r-md)", color: "var(--red)", fontSize: 12.5, marginBottom: 12 }}>{error}</div>
        )}
        {ok && (
          <div style={{ padding: "8px 11px", background: "var(--green-bg)", borderRadius: "var(--r-md)", color: "var(--green)", fontSize: 12.5, marginBottom: 12 }}>
            ✓ Submitted — your manager can see it now
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {/* Paste field first — it's the main action */}
          <div>
            <label className="label" style={{ marginBottom: 5 }}>Paste link *</label>
            <div style={{ display: "flex", gap: 5 }}>
              <input
                className="input"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={(e) => {
                  // Auto-fill an empty title from the pasted URL's file name
                  const pasted = e.clipboardData.getData("text");
                  if (pasted && !title.trim()) setTitle(guessTitle(pasted));
                }}
                placeholder="https://drive.google.com/…"
                style={{ flex: 1, minWidth: 0 }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                title="Paste from clipboard"
                style={{ flexShrink: 0, padding: "0 10px" }}
                onClick={async () => {
                  try {
                    const text = (await navigator.clipboard.readText()).trim();
                    if (text) {
                      setUrl(text);
                      if (!title.trim()) setTitle(guessTitle(text));
                    }
                  } catch {
                    setError("Clipboard blocked by your browser — paste with Ctrl+V instead");
                  }
                }}
              >
                Paste
              </button>
            </div>
            {!urlLooksValid && (
              <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 4 }}>Must start with http:// or https://</p>
            )}
            {url && urlLooksValid && (
              <p style={{ fontSize: 11.5, color: "var(--green)", marginTop: 4 }}>
                {linkTypeEmoji(effectiveType)} Detected as {linkTypeLabel(effectiveType)} · {hostOf(url)}
              </p>
            )}
          </div>

          <div>
            <label className="label" style={{ marginBottom: 5 }}>Title *</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. August creatives folder" />
          </div>

          <div>
            <label className="label" style={{ marginBottom: 5 }}>Client *</label>
            {clients.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>Loading clients…</p>
            ) : (
              <select className="input" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="label" style={{ marginBottom: 5 }}>
              Type {!linkType && url && <span style={{ color: "var(--tx-tertiary)", fontWeight: 400 }}>· auto-detected</span>}
            </label>
            <select className="input" value={effectiveType} onChange={(e) => setLinkType(e.target.value)}>
              {WORK_LINK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label" style={{ marginBottom: 5 }}>Note</label>
            <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ minHeight: 54 }} placeholder="Anything the team should know (optional)" />
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving || !urlLooksValid || !clientId}>
            {saving && <span className="spinner" style={{ width: 12, height: 12, borderTopColor: "rgba(255,255,255,0.7)" }} />}
            {saving ? "Submitting…" : "Submit link"}
          </button>
        </form>

        <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
          Submitted links appear on the client&apos;s Work URLs tab in the admin dashboard.
        </p>
      </div>
    </div>
  );
}

export default function EmployeePortalPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [workLinks, setWorkLinks] = useState<WorkLink[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveModal, setLeaveModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"tasks" | "leave" | "links">("tasks");
  const [tab, setTab] = useState<"all" | "internal" | "client">("all");
  const [sf, setSf] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/employee-portal/me");
    if (!r.ok) { router.push("/employee-login"); return; }
    setEmployee(await r.json());
    setLoading(false);
  }, [router]);

  const loadLeaves = useCallback(async () => {
    try {
      const r = await fetch("/api/employee-portal/leave-requests");
      const d = await r.json();
      setLeaves(Array.isArray(d) ? d : []);
    } catch { setLeaves([]); }
  }, []);

  const loadWorkLinks = useCallback(async () => {
    try {
      const r = await fetch("/api/employee-portal/work-links");
      const d = await r.json();
      setWorkLinks(Array.isArray(d) ? d : []);
    } catch { setWorkLinks([]); }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const r = await fetch("/api/employee-portal/clients");
      const d = await r.json();
      setClients(Array.isArray(d) ? d : []);
    } catch { setClients([]); }
  }, []);

  useEffect(() => { load(); loadLeaves(); loadWorkLinks(); loadClients(); }, [load, loadLeaves, loadWorkLinks, loadClients]);

  async function updateTask(id: string, status: string, type: string) {
    await fetch(`/api/employee-portal/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, type }) });
    await load();
  }

  async function logout() {
    await fetch("/api/employee-portal/logout", { method: "POST" });
    router.push("/employee-login");
    router.refresh();
  }

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div>;
  if (!employee) return null;

  const internal: AnyTask[] = employee.tasks.map((t) => ({ ...t, _type: "internal" as const }));
  const client: AnyTask[] = employee.clientTasks.map((t) => ({ ...t, _type: "client" as const }));
  const all = [...internal, ...client];
  const byTab = tab === "internal" ? internal : tab === "client" ? client : all;

  const q = search.trim().toLowerCase();
  const visible = byTab.filter((t) => {
    if (sf === "OVERDUE" ? !isOverdue(t) : sf && t.status !== sf) return false;
    if (q) {
      const hay = [t.title, t.description, t.category, "client" in t ? t.client?.company || t.client?.name : ""].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    // Open work first, then soonest deadline
    if ((a.status === "COMPLETED") !== (b.status === "COMPLETED")) return a.status === "COMPLETED" ? 1 : -1;
    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
  });

  const done = all.filter((t) => t.status === "COMPLETED").length;
  const inProg = all.filter((t) => t.status === "IN_PROGRESS").length;
  const pend = all.filter((t) => t.status === "PENDING").length;
  const over = all.filter((t) => isOverdue(t)).length;
  const rate = all.length > 0 ? Math.round((done / all.length) * 100) : 0;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000 - 1);
  const dueToday = all.filter((t) => t.status !== "COMPLETED" && new Date(t.endDate) >= startOfToday && new Date(t.endDate) <= endOfToday).length;
  const pendingLeaves = leaves.filter((l) => l.status === "PENDING").length;
  const approvedLeaveDays = leaves.filter((l) => l.status === "APPROVED").reduce((s, l) => s + l.days, 0);

  // Clients the employee already has work for, surfaced first in the picker
  const assignedIds = new Set(employee.clientTasks.filter((t) => t.client).map((t) => t.client.id));
  const clientOptions: ClientOption[] = [...clients].sort((a, b) => {
    const aAssigned = assignedIds.has(a.id) ? 0 : 1;
    const bAssigned = assignedIds.has(b.id) ? 0 : 1;
    if (aAssigned !== bAssigned) return aAssigned - bAssigned;
    return (a.company || a.name).localeCompare(b.company || b.name);
  });

  const STAT_CARDS = [
    { label: "Total Tasks", val: all.length, sub: `${internal.length} internal · ${client.length} client`, bg: "var(--purple-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" /></svg> },
    { label: "Completed", val: done, sub: `${rate}% of your work`, bg: "var(--green-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F9D58" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
    { label: "In Progress", val: inProg, sub: "currently active", bg: "var(--blue-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2383E2" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { label: "Pending", val: pend, sub: "not started", bg: "var(--amber-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> },
    { label: "Overdue", val: over, sub: "needs attention", bg: "var(--red-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
  ];

  const segments = [
    { label: "Completed", count: done, color: "var(--green)" },
    { label: "In progress", count: inProg, color: "var(--blue)" },
    { label: "Pending", count: pend, color: "var(--amber)" },
    { label: "Overdue", count: over, color: "var(--red)" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)" }}>
      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="topbar-avatar">{employee.name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)}</div>
          <div>
            <p className="name" style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-primary)", lineHeight: 1.2 }}>{employee.name}</p>
            <p className="role" style={{ fontSize: 11, color: "var(--tx-tertiary)", lineHeight: 1.2 }}>{employee.position} · {employee.department}</p>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {([["Done", done, "badge-green"], ["Active", inProg, "badge-blue"], ["Overdue", over, "badge-red"]] as [string, number, string][]).map(([l, v, cls]) => (
            <span key={l} className={`badge ${v > 0 ? cls : "badge-gray"}`}>{v} {l}</span>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setLeaveModal(true)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          Request leave
        </button>
        <button className="btn btn-secondary btn-sm" onClick={logout}>Sign out</button>
      </div>

      <div className="page-section" style={{ maxWidth: 1180, paddingTop: 28 }}>
        {/* ── Header ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 22 }} className="anim-up">
          <p style={{ fontSize: 13, color: "var(--tx-tertiary)", marginBottom: 4 }}>
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="page-title" style={{ fontSize: 24 }}>My Workspace</h1>
          <p style={{ fontSize: 14, color: "var(--tx-secondary)", marginTop: 6 }}>
            {over > 0
              ? `You have ${over} overdue task${over === 1 ? "" : "s"} that need attention.`
              : dueToday > 0
                ? `You have ${dueToday} task${dueToday === 1 ? "" : "s"} due today.`
                : "You're all caught up — nothing overdue or due today."}
            {pendingLeaves > 0 && ` ${pendingLeaves} leave request${pendingLeaves === 1 ? "" : "s"} awaiting approval.`}
          </p>
        </div>

        {/* ── View switcher ────────────────────────────────────────── */}
        <div className="filter-tabs-wrap anim-up" style={{ marginBottom: 16 }}>
          {([
            ["tasks", "My tasks", all.length],
            ["links", "Work links", workLinks.length],
            ["leave", "Leave", leaves.length],
          ] as const).map(([k, l, c]) => (
            <button key={k} className={`filter-tab${view === k ? " active" : ""}`} onClick={() => setView(k)}>
              {l} <span className="count">{c}</span>
            </button>
          ))}
        </div>

        {/* ── Stat cards ───────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
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

        {/* ── Progress ─────────────────────────────────────────────── */}
        <div className="card anim-up" style={{ padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <p className="section-title">Overall progress</p>
              <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 2 }}>{done} of {all.length} tasks completed</p>
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", letterSpacing: "-0.02em" }}>{rate}%</p>
          </div>
          <div className="progress-track" style={{ height: 8, marginBottom: 10 }}>
            <div style={{ display: "flex", height: "100%" }}>
              {segments.map((s) => (
                <div key={s.label} style={{ width: all.length > 0 ? `${(s.count / all.length) * 100}%` : 0, background: s.color, transition: "width .7s cubic-bezier(.16,1,.3,1)" }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {segments.map((s) => (
              <span key={s.label} className="att-legend-chip">
                <span className="dot" style={{ background: s.color }} />{s.label} <strong style={{ color: "var(--tx-primary)" }}>{s.count}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* ── Work links view ──────────────────────────────────────── */}
        {view === "links" && (
          <div className="tab-fade">
            <WorkLinksPanel links={workLinks} clients={clientOptions} onSubmitted={loadWorkLinks} />
          </div>
        )}

        {/* ── Leave view ───────────────────────────────────────────── */}
        {view === "leave" && (
          <div className="tab-fade" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
            <LeavePanel requests={leaves} onRequest={() => setLeaveModal(true)} />

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="rail-card">
                <p className="section-title" style={{ marginBottom: 12 }}>Leave summary</p>
                {([
                  ["Requests raised", leaves.length, "var(--tx-primary)"],
                  ["Approved days", approvedLeaveDays, "var(--green)"],
                  ["Awaiting review", pendingLeaves, "var(--amber)"],
                  ["Rejected", leaves.filter((l) => l.status === "REJECTED").length, "var(--red)"],
                ] as [string, number, string][]).map(([label, val, color]) => (
                  <div key={label} className="rail-stat-row">
                    <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--tx-secondary)" }}>
                      <span className="dot" style={{ background: color }} />{label}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-primary)" }}>{val}</span>
                  </div>
                ))}
              </div>

              <div className="rail-card">
                <p className="section-title" style={{ marginBottom: 8 }}>How it works</p>
                <ol style={{ paddingLeft: 16, display: "flex", flexDirection: "column", gap: 7 }}>
                  {[
                    "Pick a reason and your dates — future dates are fine.",
                    "Your manager sees the request in their notifications.",
                    "Once approved, those days show as leave on your attendance.",
                  ].map((step) => (
                    <li key={step} style={{ fontSize: 12, color: "var(--tx-secondary)", lineHeight: 1.5 }}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* ── Tasks + calendar ─────────────────────────────────────── */}
        <div style={{ display: view === "tasks" ? "grid" : "none", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
          <div style={{ minWidth: 0 }}>
            {/* Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <div className="filter-tabs-wrap">
                {([["all", "All", all.length], ["internal", "Internal", internal.length], ["client", "Client", client.length]] as const).map(([k, l, c]) => (
                  <button key={k} className={`filter-tab${tab === k ? " active" : ""}`} onClick={() => { setTab(k); setSf(""); }}>
                    {l} <span className="count">{c}</span>
                  </button>
                ))}
              </div>
              <div className="filter-tabs-wrap">
                {([
                  ["", "All", byTab.length],
                  ["PENDING", "Pending", byTab.filter((t) => t.status === "PENDING").length],
                  ["IN_PROGRESS", "Active", byTab.filter((t) => t.status === "IN_PROGRESS").length],
                  ["COMPLETED", "Done", byTab.filter((t) => t.status === "COMPLETED").length],
                  ["OVERDUE", "Overdue", byTab.filter((t) => isOverdue(t)).length],
                ] as [string, string, number][]).map(([k, l, c]) => (
                  <button key={k} className={`filter-tab${sf === k ? " active" : ""}`} onClick={() => setSf(k)}>
                    {l} <span className="count">{c}</span>
                  </button>
                ))}
              </div>
              <div className="search-wrap" style={{ marginLeft: "auto", maxWidth: 200 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search my tasks…" />
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="card empty" style={{ padding: 60 }}>
                <p style={{ fontSize: 24, marginBottom: 8 }}>🎉</p>
                <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>{all.length === 0 ? "No tasks assigned yet" : "Nothing here"}</p>
                <p style={{ fontSize: 13 }}>{all.length === 0 ? "Your manager hasn't assigned you any tasks" : "Try a different filter or search term"}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {visible.map((t) => <TaskCard key={`${t._type}-${t.id}`} task={t} onUpdate={updateTask} />)}
              </div>
            )}
          </div>

          <Calendar tasks={all} />
        </div>
      </div>

      {leaveModal && (
        <LeaveModal
          onClose={() => setLeaveModal(false)}
          onSaved={() => { loadLeaves(); setView("leave"); }}
        />
      )}
    </div>
  );
}
