"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type AS = "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE" | "HOLIDAY" | "WEEKEND";
type AR = { id: string; date: string; status: AS; note?: string };
type Emp = { id: string; name: string; department: string; position: string; status: string };

const CFG: Record<AS, { label: string; short: string; color: string; bg: string }> = {
  PRESENT:  { label: "Present",  short: "P", color: "var(--green)",        bg: "var(--green-bg)" },
  ABSENT:   { label: "Absent",   short: "A", color: "var(--red)",          bg: "var(--red-bg)" },
  HALF_DAY: { label: "Half day", short: "½", color: "var(--blue)",         bg: "var(--blue-bg)" },
  LEAVE:    { label: "Leave",    short: "L", color: "var(--amber)",        bg: "var(--amber-bg)" },
  HOLIDAY:  { label: "Holiday",  short: "H", color: "var(--purple)",       bg: "var(--purple-bg)" },
  WEEKEND:  { label: "Weekend",  short: "W", color: "var(--tx-tertiary)",  bg: "var(--gray-tag)" },
};

const STATUSES: AS[] = ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "HOLIDAY"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function dk(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

export default function AttendancePage() {
  const { id } = useParams<{ id: string }>();
  const today = new Date();

  const [emp, setEmp] = useState<Emp | null>(null);
  const [records, setRecords] = useState<Map<string, AR>>(new Map());
  const [yr, setYr] = useState(today.getFullYear());
  const [mo, setMo] = useState(today.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<AS>("PRESENT");

  useEffect(() => {
    fetch(`/api/employees/${id}`).then((r) => r.json()).then(setEmp).catch(console.error);
  }, [id]);

  const fetchAtt = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/attendance/${id}?year=${yr}&month=${mo}`);
    const data: AR[] = await res.json();
    const map = new Map<string, AR>();
    (Array.isArray(data) ? data : []).forEach((r) => map.set(r.date.split("T")[0], r));
    setRecords(map);
    setLoading(false);
  }, [id, yr, mo]);

  useEffect(() => { fetchAtt(); }, [fetchAtt]);

  async function markDay(dateStr: string, status: AS) {
    setSaving(dateStr);
    await fetch(`/api/attendance/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr, status }),
    });
    await fetchAtt();
    setSaving(null);
  }

  async function bulkMark() {
    if (!selected.size) return;
    setSaving("bulk");
    await Promise.all(
      [...selected].map((d) =>
        fetch(`/api/attendance/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: d, status: bulkStatus }),
        }),
      ),
    );
    await fetchAtt();
    setSelected(new Set());
    setSaving(null);
  }

  const daysInMonth = new Date(yr, mo, 0).getDate();
  const firstDay = new Date(yr, mo - 1, 1).getDay();
  const todayKey = dk(today);

  const cells = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const d = new Date(yr, mo - 1, day);
    const k = dk(d);
    const isWeekend = d.getDay() === 0;
    const rec = records.get(k);
    return {
      day, k, isWeekend,
      isToday: k === todayKey,
      isFuture: d > today && k !== todayKey,
      rec,
      status: (rec?.status || (isWeekend ? "WEEKEND" : undefined)) as AS | undefined,
    };
  });

  const vals = [...records.values()];
  const present = vals.filter((r) => r.status === "PRESENT").length;
  const absent  = vals.filter((r) => r.status === "ABSENT").length;
  const halfDay = vals.filter((r) => r.status === "HALF_DAY").length;
  const leave   = vals.filter((r) => r.status === "LEAVE").length;
  const holiday = vals.filter((r) => r.status === "HOLIDAY").length;
  const workDays = cells.filter((c) => !c.isWeekend).length;
  const effective = present + halfDay * 0.5;
  const rate = workDays > 0 ? Math.round((effective / workDays) * 100) : 0;
  const unmarked = cells.filter((c) => !c.isWeekend && !c.isFuture && !c.rec).length;

  const isCurrentMonth = yr === today.getFullYear() && mo === today.getMonth() + 1;
  const yearOptions = Array.from({ length: 6 }, (_, i) => today.getFullYear() - 4 + i);

  function prevMonth() {
    if (mo === 1) { setYr((y) => y - 1); setMo(12); } else setMo((m) => m - 1);
    setSelected(new Set());
  }
  function nextMonth() {
    if (mo === 12) { setYr((y) => y + 1); setMo(1); } else setMo((m) => m + 1);
    setSelected(new Set());
  }

  const STAT_CARDS: { label: string; val: number | string; color: string; bg: string; icon: React.ReactNode }[] = [
    { label: "Present", val: present, color: "var(--green)", bg: "var(--green-bg)", icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F9D58" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
    ) },
    { label: "Absent", val: absent, color: "var(--red)", bg: "var(--red-bg)", icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
    ) },
    { label: "Half day", val: halfDay, color: "var(--blue)", bg: "var(--blue-bg)", icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2383E2" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 0 0 20z" fill="#2383E2" stroke="none" /></svg>
    ) },
    { label: "Leave", val: leave, color: "var(--amber)", bg: "var(--amber-bg)", icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
    ) },
    { label: "Holiday", val: holiday, color: "var(--purple)", bg: "var(--purple-bg)", icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
    ) },
    { label: "Days worked", val: `${effective}/${workDays}`, color: "var(--accent)", bg: "var(--purple-bg)", icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M20 7h-9M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></svg>
    ) },
  ];

  return (
    <div className="page-section" style={{ maxWidth: 1180 }}>
      <div className="breadcrumb">
        <Link href="/dashboard/employees">Employees</Link>
        <span className="breadcrumb-sep">/</span>
        {emp ? <Link href={`/dashboard/employees/${id}`}>{emp.name}</Link> : <span>Employee</span>}
        <span className="breadcrumb-sep">/</span>
        <span style={{ color: "var(--tx-primary)" }}>Attendance</span>
      </div>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }} className="anim-up">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="avatar avatar-lg" style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff" }}>
            {emp ? emp.name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "—"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 className="page-title" style={{ fontSize: 22 }}>Attendance</h1>
              {isCurrentMonth && <span className="badge badge-purple">This month</span>}
            </div>
            <p style={{ fontSize: 13, color: "var(--tx-tertiary)", marginTop: 3 }}>
              {emp ? `${emp.name} · ${emp.position} · ${emp.department}` : "Loading…"}
            </p>
          </div>
        </div>

        {/* Month navigator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn btn-secondary btn-icon" onClick={prevMonth} title="Previous month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <select className="input" value={mo} onChange={(e) => { setMo(Number(e.target.value)); setSelected(new Set()); }} style={{ width: "auto", fontSize: 12.5 }}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="input" value={yr} onChange={(e) => { setYr(Number(e.target.value)); setSelected(new Set()); }} style={{ width: "auto", fontSize: 12.5 }}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-secondary btn-icon" onClick={nextMonth} disabled={isCurrentMonth} title="Next month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          {!isCurrentMonth && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setYr(today.getFullYear()); setMo(today.getMonth() + 1); setSelected(new Set()); }}>
              Today
            </button>
          )}
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 16 }}>
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} className={`stat-card anim-up d${(i % 4) + 1}`} style={{ padding: "14px 15px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p className="label-text" style={{ fontSize: 9.5 }}>{s.label}</p>
              <div className="icon-chip" style={{ background: s.bg, width: 28, height: 28 }}>{s.icon}</div>
            </div>
            <p className="stat-value" style={{ fontSize: 22, color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* ── Attendance rate ────────────────────────────────────────── */}
      <div className="card anim-up" style={{ padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <p className="section-title">Attendance rate — {MONTHS[mo - 1]} {yr}</p>
            <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 2 }}>
              {effective} effective of {workDays} working days
              {unmarked > 0 && ` · ${unmarked} day${unmarked === 1 ? "" : "s"} still unmarked`}
            </p>
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", letterSpacing: "-0.02em" }}>{rate}%</p>
        </div>
        <div className="progress-track" style={{ height: 8 }}>
          <div style={{ display: "flex", height: "100%" }}>
            {([
              [present, "var(--green)"],
              [halfDay, "var(--blue)"],
              [leave, "var(--amber)"],
              [absent, "var(--red)"],
              [holiday, "var(--purple)"],
            ] as [number, string][]).map(([count, color], i) => (
              <div key={i} style={{ width: workDays > 0 ? `${(count / workDays) * 100}%` : 0, background: color, transition: "width .7s cubic-bezier(.16,1,.3,1)" }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          className={`btn ${bulkMode ? "btn-primary" : "btn-secondary"} btn-sm`}
          onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
          {bulkMode ? `${selected.size} selected` : "Bulk edit"}
        </button>

        {bulkMode ? (
          <>
            <select className="input" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as AS)} style={{ width: "auto", fontSize: 12.5 }}>
              {STATUSES.map((s) => <option key={s} value={s}>{CFG[s].label}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={bulkMark} disabled={selected.size === 0 || saving === "bulk"}>
              {saving === "bulk" && <span className="spinner" style={{ width: 11, height: 11, borderTopColor: "rgba(255,255,255,0.7)" }} />}
              Apply to {selected.size} day{selected.size === 1 ? "" : "s"}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(new Set()); setBulkMode(false); }}>Cancel</button>
            <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginLeft: 4 }}>Click days to select them</p>
          </>
        ) : (
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUSES.map((s) => (
              <span key={s} className="att-legend-chip">
                <span className="dot" style={{ background: CFG[s].color }} />
                {CFG[s].label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Calendar ───────────────────────────────────────────────── */}
      <div className="card anim-up" style={{ overflow: "hidden", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--border)", background: "var(--hover-bg)" }}>
          {DAY_LABELS.map((d) => (
            <div key={d} className="label-text" style={{ padding: "10px 0", textAlign: "center", fontSize: 10 }}>{d}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`e${i}`} className="cal-cell" style={{ background: "var(--hover-bg)", opacity: 0.4 }} />
            ))}
            {cells.map(({ day, k, isWeekend, isToday, isFuture, rec, status }) => {
              const cfg = status ? CFG[status] : null;
              const isSel = selected.has(k);
              const lastCol = (firstDay + day - 1) % 7 === 6;
              const isSaving = saving === k;
              const markable = !isFuture && !isWeekend;

              return (
                <div
                  key={k}
                  className={`cal-cell${markable ? " is-markable" : ""}${isToday ? " is-today" : ""}`}
                  onClick={() => {
                    if (!bulkMode || !markable) return;
                    setSelected((prev) => {
                      const s = new Set(prev);
                      if (s.has(k)) s.delete(k); else s.add(k);
                      return s;
                    });
                  }}
                  title={rec?.note || undefined}
                  style={{
                    minHeight: 84,
                    borderRight: lastCol ? "none" : "1px solid var(--border)",
                    background: isSel ? "var(--accent-bg)" : isWeekend ? "var(--hover-bg)" : undefined,
                    cursor: markable ? "pointer" : "default",
                    opacity: isFuture ? 0.45 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className={`cal-day-num${isToday ? " today" : ""}`}>{day}</span>
                    {isSel && (
                      <span style={{ width: 15, height: 15, background: "var(--accent)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                    )}
                    {isSaving && <span className="spinner" style={{ width: 11, height: 11 }} />}
                  </div>

                  {cfg && (
                    <span className="att-chip" style={{ background: cfg.bg, color: cfg.color }}>
                      <span className="dot" style={{ background: cfg.color, width: 5, height: 5 }} />
                      {cfg.label}
                    </span>
                  )}
                  {!cfg && markable && (
                    <span style={{ fontSize: 10.5, color: "var(--tx-disabled)" }}>Not marked</span>
                  )}
                  {rec?.note && (
                    <p style={{ fontSize: 10, color: "var(--tx-tertiary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {rec.note}
                    </p>
                  )}

                  {/* Hover picker */}
                  {markable && (
                    <div className="cal-picker" onClick={(e) => e.stopPropagation()}>
                      {bulkMode ? (
                        <div style={{ gridColumn: "span 3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <p style={{ fontSize: 10.5, color: isSel ? "var(--accent)" : "var(--tx-tertiary)", textAlign: "center", fontWeight: 500 }}>
                            {isSel ? "✓ Selected" : "Click to select"}
                          </p>
                        </div>
                      ) : (
                        STATUSES.map((s) => (
                          <button
                            key={s}
                            className="cal-pick-btn"
                            onClick={() => markDay(k, s)}
                            title={`Mark ${CFG[s].label}`}
                            style={{ background: CFG[s].bg, color: CFG[s].color }}
                          >
                            {CFG[s].short}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Monthly summary ────────────────────────────────────────── */}
      <div className="card anim-up" style={{ overflow: "hidden" }}>
        <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
          <p className="section-title">Monthly summary — {MONTHS[mo - 1]} {yr}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {([
            ["Working days", workDays, "excludes Sundays", "var(--tx-primary)"],
            ["Days present", present, "full attendance", "var(--green)"],
            ["Half days", halfDay, `counts as ${halfDay * 0.5} days`, "var(--blue)"],
            ["Days on leave", leave, "approved", "var(--amber)"],
            ["Days absent", absent, "no show", "var(--red)"],
            ["Holidays", holiday, "marked", "var(--purple)"],
            ["Effective days", effective, `of ${workDays} working days`, "var(--tx-primary)"],
            ["Attendance rate", `${rate}%`, unmarked > 0 ? `${unmarked} day(s) unmarked` : "all days marked", "var(--accent)"],
          ] as [string, number | string, string, string][]).map(([label, val, sub, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, color: "var(--tx-primary)" }}>{label}</p>
                {sub && <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)", marginTop: 1 }}>{sub}</p>}
              </div>
              <p style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: "-0.02em", flexShrink: 0 }}>{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
