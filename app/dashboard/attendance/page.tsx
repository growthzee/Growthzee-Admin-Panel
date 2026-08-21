"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ATTENDANCE_CFG, MARKABLE_STATUSES, MONTH_NAMES, DAY_INITIALS,
  WORK_HOURS_LABEL, WORK_WEEK_LABEL,
  dateKey, isWorkingDay, workingDaysInMonth,
  type AttendanceStatusValue,
} from "@/lib/workSchedule";

type Employee = { id: string; name: string; department: string; position: string; status: string };
type Record_ = { id: string; employeeId: string; date: string; status: string; note?: string | null };

const DEPTS = ["Engineering", "Design", "Marketing", "Sales", "HR", "Finance", "Operations"];

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function TeamAttendancePage() {
  const today = useMemo(() => new Date(), []);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<Map<string, Record_>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const [yr, setYr] = useState(today.getFullYear());
  const [mo, setMo] = useState(today.getMonth() + 1);
  const [view, setView] = useState<"day" | "month">("day");
  const [selectedDay, setSelectedDay] = useState(dateKey(today));
  const [deptFilter, setDeptFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Bulk mode
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatusValue>("PRESENT");
  const [selected, setSelected] = useState<Set<string>>(new Set()); // "employeeId|date"

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/attendance?year=${yr}&month=${mo}`);
    const d = await res.json();
    setEmployees(Array.isArray(d.employees) ? d.employees : []);
    const map = new Map<string, Record_>();
    (Array.isArray(d.records) ? d.records : []).forEach((r: Record_) => {
      map.set(`${r.employeeId}|${r.date.split("T")[0]}`, r);
    });
    setRecords(map);
    setLoading(false);
  }, [yr, mo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelected(new Set()); }, [yr, mo, view]);

  /** Persist one or many marks in a single request */
  async function save(entries: { employeeId: string; date: string; status: string }[]) {
    if (entries.length === 0) return;
    setSaving(true);
    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    await load();
    setSaving(false);
    setSavedMsg(`Saved ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`);
    setTimeout(() => setSavedMsg(""), 2500);
  }

  const daysInMonth = new Date(yr, mo, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(yr, mo - 1, i + 1);
    return { day: i + 1, date: d, key: dateKey(d), working: isWorkingDay(d), isToday: dateKey(d) === dateKey(today), isFuture: d > today && dateKey(d) !== dateKey(today) };
  });
  const workDays = workingDaysInMonth(yr, mo);

  const filteredEmployees = employees.filter((e) => {
    if (deptFilter !== "All" && e.department !== deptFilter) return false;
    const q = search.trim().toLowerCase();
    if (q && !e.name.toLowerCase().includes(q) && !e.department.toLowerCase().includes(q)) return false;
    return true;
  });

  function recFor(employeeId: string, key: string) { return records.get(`${employeeId}|${key}`); }

  // ── Day view stats ──────────────────────────────────────────────────────
  const selDate = new Date(selectedDay + "T12:00:00");
  const selIsWorking = isWorkingDay(selDate);
  const dayCounts = MARKABLE_STATUSES.reduce((acc, s) => {
    acc[s] = filteredEmployees.filter((e) => recFor(e.id, selectedDay)?.status === s).length;
    return acc;
  }, {} as Record<string, number>);
  const unmarkedToday = filteredEmployees.filter((e) => !recFor(e.id, selectedDay)).length;

  // ── Month stats ─────────────────────────────────────────────────────────
  const monthPresent = Array.from(records.values()).filter((r) => r.status === "PRESENT").length;
  const monthHalf = Array.from(records.values()).filter((r) => r.status === "HALF_DAY").length;
  const monthAbsent = Array.from(records.values()).filter((r) => r.status === "ABSENT").length;
  const monthLeave = Array.from(records.values()).filter((r) => r.status === "LEAVE").length;
  const possible = workDays * Math.max(1, filteredEmployees.length);
  const monthRate = possible > 0 ? Math.round(((monthPresent + monthHalf * 0.5) / possible) * 100) : 0;

  const STAT_CARDS = [
    { label: "Team Members", val: filteredEmployees.length, sub: `${employees.length} total`, bg: "var(--purple-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg> },
    { label: "Present", val: dayCounts.PRESENT || 0, sub: "on selected day", bg: "var(--green-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F9D58" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
    { label: "Absent", val: dayCounts.ABSENT || 0, sub: "on selected day", bg: "var(--red-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg> },
    { label: "On Leave", val: dayCounts.LEAVE || 0, sub: "on selected day", bg: "var(--amber-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg> },
    { label: "Working Days", val: workDays, sub: MONTH_NAMES[mo - 1], bg: "var(--blue-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2383E2" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
    { label: "Attendance Rate", val: `${monthRate}%`, sub: "month to date", bg: "var(--purple-bg)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> },
  ];

  const isCurrentMonth = yr === today.getFullYear() && mo === today.getMonth() + 1;

  return (
    <div className="wide-section">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }} className="anim-up">
        <div>
          <h1 className="page-title" style={{ fontSize: 24 }}>Attendance</h1>
          <p style={{ fontSize: 13.5, color: "var(--tx-tertiary)", marginTop: 5 }}>
            {WORK_WEEK_LABEL} · {WORK_HOURS_LABEL} · {workDays} working days in {MONTH_NAMES[mo - 1]}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {savedMsg && <span className="badge badge-green">{savedMsg}</span>}
          <div className="filter-tabs-wrap">
            {([["day", "Day view"], ["month", "Month grid"]] as const).map(([k, l]) => (
              <button key={k} className={`filter-tab${view === k ? " active" : ""}`} onClick={() => setView(k)}>{l}</button>
            ))}
          </div>
          <button className="btn btn-secondary btn-icon" onClick={() => { if (mo === 1) { setYr((y) => y - 1); setMo(12); } else setMo((m) => m - 1); }} title="Previous month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <select className="input" value={mo} onChange={(e) => setMo(Number(e.target.value))} style={{ width: "auto", fontSize: 12.5 }}>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="input" value={yr} onChange={(e) => setYr(Number(e.target.value))} style={{ width: "auto", fontSize: 12.5 }}>
            {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 3 + i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-secondary btn-icon" onClick={() => { if (mo === 12) { setYr((y) => y + 1); setMo(1); } else setMo((m) => m + 1); }} disabled={isCurrentMonth} title="Next month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
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

            {/* ── Filters ────────────────────────────────────────── */}
            <div className="card anim-up" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div className="filter-tabs-wrap">
                <button className={`filter-tab${deptFilter === "All" ? " active" : ""}`} onClick={() => setDeptFilter("All")}>
                  All <span className="count">{employees.length}</span>
                </button>
                {DEPTS.filter((d) => employees.some((e) => e.department === d)).map((d) => (
                  <button key={d} className={`filter-tab${deptFilter === d ? " active" : ""}`} onClick={() => setDeptFilter(d)}>{d}</button>
                ))}
              </div>
              <div className="search-wrap" style={{ marginLeft: "auto", maxWidth: 200 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team…" />
              </div>
            </div>

            {/* ── DAY VIEW ───────────────────────────────────────── */}
            {view === "day" && (
              <div className="card tab-fade" style={{ overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ marginRight: "auto" }}>
                    <p className="section-title">
                      {selDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 2 }}>
                      {selIsWorking
                        ? `${unmarkedToday} of ${filteredEmployees.length} still unmarked`
                        : "Weekend — not a working day"}
                    </p>
                  </div>
                  <input className="input" type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} style={{ width: "auto", fontSize: 12.5 }} />
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDay(dateKey(today))}>Today</button>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={saving || !selIsWorking || filteredEmployees.length === 0}
                    title="Mark everyone shown as present"
                    onClick={() => save(filteredEmployees.map((e) => ({ employeeId: e.id, date: selectedDay, status: "PRESENT" })))}
                  >
                    {saving && <span className="spinner" style={{ width: 11, height: 11, borderTopColor: "rgba(255,255,255,0.7)" }} />}
                    Mark all present
                  </button>
                </div>

                {!selIsWorking && (
                  <div style={{ padding: "10px 16px", background: "var(--hover-bg)", borderBottom: "1px solid var(--border)", fontSize: 12.5, color: "var(--tx-tertiary)" }}>
                    This is a weekend. You can still mark people if they worked.
                  </div>
                )}

                {filteredEmployees.length === 0 ? (
                  <div className="empty" style={{ padding: 60 }}>
                    <p style={{ fontSize: 24, marginBottom: 8 }}>👥</p>
                    <p style={{ fontWeight: 600, color: "var(--tx-secondary)" }}>No team members match</p>
                    <p style={{ fontSize: 13 }}>Try a different department or search</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr><th>Team member</th><th>Department</th><th>Status</th><th style={{ textAlign: "right" }}>Mark as</th><th></th></tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((emp) => {
                        const rec = recFor(emp.id, selectedDay);
                        const cur = rec?.status as AttendanceStatusValue | undefined;
                        return (
                          <tr key={emp.id} style={{ cursor: "default" }}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <div className="avatar">{initials(emp.name)}</div>
                                <div style={{ minWidth: 0 }}>
                                  <Link href={`/dashboard/employees/${emp.id}`} style={{ fontSize: 13, fontWeight: 500, color: "var(--tx-primary)", textDecoration: "none" }}>
                                    {emp.name}
                                  </Link>
                                  <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{emp.position}</p>
                                </div>
                              </div>
                            </td>
                            <td><span className="badge badge-purple">{emp.department}</span></td>
                            <td>
                              {cur ? (
                                <span className="att-chip" style={{ background: ATTENDANCE_CFG[cur].bg, color: ATTENDANCE_CFG[cur].color }}>
                                  <span className="dot" style={{ background: ATTENDANCE_CFG[cur].color, width: 5, height: 5 }} />
                                  {ATTENDANCE_CFG[cur].label}
                                </span>
                              ) : (
                                <span style={{ fontSize: 12, color: "var(--tx-disabled)" }}>Not marked</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                {MARKABLE_STATUSES.map((s) => (
                                  <button
                                    key={s}
                                    className="att-mark-btn"
                                    data-active={cur === s}
                                    title={ATTENDANCE_CFG[s].label}
                                    disabled={saving}
                                    style={{ background: cur === s ? ATTENDANCE_CFG[s].color : ATTENDANCE_CFG[s].bg, color: cur === s ? "#fff" : ATTENDANCE_CFG[s].color }}
                                    onClick={() => save([{ employeeId: emp.id, date: selectedDay, status: s }])}
                                  >
                                    {ATTENDANCE_CFG[s].short}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td>
                              <Link
                                href={`/dashboard/employees/${emp.id}/attendance`}
                                className="btn-ghost btn-icon"
                                title={`Open ${emp.name}'s full attendance calendar`}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── MONTH GRID ─────────────────────────────────────── */}
            {view === "month" && (
              <div className="card tab-fade" style={{ overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ marginRight: "auto" }}>
                    <p className="section-title">{MONTH_NAMES[mo - 1]} {yr}</p>
                    <p style={{ fontSize: 12, color: "var(--tx-tertiary)", marginTop: 2 }}>
                      {bulkMode ? `${selected.size} cell${selected.size === 1 ? "" : "s"} selected — pick a status and apply` : "Click any cell to cycle status, or turn on bulk edit"}
                    </p>
                  </div>

                  <button
                    className={`btn ${bulkMode ? "btn-primary" : "btn-secondary"} btn-sm`}
                    onClick={() => { setBulkMode((b) => !b); setSelected(new Set()); }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                    {bulkMode ? "Bulk edit on" : "Bulk edit"}
                  </button>

                  {bulkMode && (
                    <>
                      <select className="input" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as AttendanceStatusValue)} style={{ width: "auto", fontSize: 12.5 }}>
                        {MARKABLE_STATUSES.map((s) => <option key={s} value={s}>{ATTENDANCE_CFG[s].label}</option>)}
                      </select>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={selected.size === 0 || saving}
                        onClick={() => {
                          const entries = Array.from(selected).map((token) => {
                            const [employeeId, date] = token.split("|");
                            return { employeeId, date, status: bulkStatus };
                          });
                          save(entries).then(() => setSelected(new Set()));
                        }}
                      >
                        {saving && <span className="spinner" style={{ width: 11, height: 11, borderTopColor: "rgba(255,255,255,0.7)" }} />}
                        Apply to {selected.size}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
                    </>
                  )}
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table className="att-grid">
                    <thead>
                      <tr>
                        <th className="att-grid-name">Team member</th>
                        {monthDays.map((d) => (
                          <th key={d.key} className={`att-grid-day${d.working ? "" : " weekend"}${d.isToday ? " today" : ""}`}>
                            <span className="att-grid-dow">{DAY_INITIALS[d.date.getDay()]}</span>
                            <span>{d.day}</span>
                          </th>
                        ))}
                        <th className="att-grid-total">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((emp) => {
                        const marked = monthDays.filter((d) => d.working).map((d) => recFor(emp.id, d.key));
                        const p = marked.filter((r) => r?.status === "PRESENT").length;
                        const h = marked.filter((r) => r?.status === "HALF_DAY").length;
                        const pct = workDays > 0 ? Math.round(((p + h * 0.5) / workDays) * 100) : 0;
                        const col = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
                        return (
                          <tr key={emp.id}>
                            <td className="att-grid-name">
                              <Link
                                href={`/dashboard/employees/${emp.id}/attendance`}
                                title={`Open ${emp.name}'s full attendance calendar`}
                                style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
                              >
                                <div className="avatar" style={{ width: 24, height: 24, fontSize: 9 }}>{initials(emp.name)}</div>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontSize: 12.5, fontWeight: 500, color: "var(--tx-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.name}</p>
                                  <p style={{ fontSize: 10.5, color: "var(--tx-tertiary)" }}>{emp.department}</p>
                                </div>
                              </Link>
                            </td>

                            {monthDays.map((d) => {
                              const token = `${emp.id}|${d.key}`;
                              const rec = recFor(emp.id, d.key);
                              const st = (rec?.status as AttendanceStatusValue | undefined) || (d.working ? undefined : "WEEKEND");
                              const isSel = selected.has(token);
                              const cfg = st ? ATTENDANCE_CFG[st] : null;
                              return (
                                <td key={d.key} className={`att-grid-cell${d.working ? "" : " weekend"}${d.isToday ? " today" : ""}`}>
                                  <button
                                    className="att-grid-mark"
                                    data-selected={isSel}
                                    disabled={saving || d.isFuture}
                                    title={`${emp.name} · ${d.date.toLocaleDateString("en-US", { day: "numeric", month: "short" })}${cfg ? ` · ${cfg.label}` : ""}`}
                                    style={{
                                      background: isSel ? "var(--accent)" : cfg ? cfg.bg : "transparent",
                                      color: isSel ? "#fff" : cfg ? cfg.color : "var(--tx-disabled)",
                                    }}
                                    onClick={() => {
                                      if (bulkMode) {
                                        setSelected((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(token)) next.delete(token); else next.add(token);
                                          return next;
                                        });
                                        return;
                                      }
                                      // Cycle through the markable statuses on click
                                      const idx = st && st !== "WEEKEND" ? MARKABLE_STATUSES.indexOf(st) : -1;
                                      const next = MARKABLE_STATUSES[(idx + 1) % MARKABLE_STATUSES.length];
                                      save([{ employeeId: emp.id, date: d.key, status: next }]);
                                    }}
                                  >
                                    {isSel ? "✓" : cfg ? cfg.short : "·"}
                                  </button>
                                </td>
                              );
                            })}

                            <td className="att-grid-total">
                              <span style={{ fontSize: 11.5, fontWeight: 700, color: col }}>{pct}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredEmployees.length === 0 && (
                  <div className="empty" style={{ padding: 50 }}><p>No team members match your filters</p></div>
                )}
              </div>
            )}

            {/* ── Legend ─────────────────────────────────────────── */}
            <div className="card anim-up" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--tx-tertiary)", marginRight: 4 }}>Legend:</span>
              {MARKABLE_STATUSES.map((s) => (
                <span key={s} className="att-legend-chip">
                  <span className="dot" style={{ background: ATTENDANCE_CFG[s].color }} />
                  {ATTENDANCE_CFG[s].short} · {ATTENDANCE_CFG[s].label}
                </span>
              ))}
              <span className="att-legend-chip">
                <span className="dot" style={{ background: "var(--tx-disabled)" }} />
                Weekend (Sat / Sun)
              </span>
            </div>
          </div>

          {/* ── Right rail ────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="rail-card anim-up">
              <p className="section-title" style={{ marginBottom: 10 }}>Office schedule</p>
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 11px", background: "var(--accent-bg)", borderRadius: "var(--r-md)", marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>🕘</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{WORK_HOURS_LABEL}</p>
                  <p style={{ fontSize: 11.5, color: "var(--tx-tertiary)" }}>{WORK_WEEK_LABEL}</p>
                </div>
              </div>
              <div className="rail-stat-row">
                <span style={{ fontSize: 12.5, color: "var(--tx-secondary)" }}>Hours per day</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-primary)" }}>9</span>
              </div>
              <div className="rail-stat-row">
                <span style={{ fontSize: 12.5, color: "var(--tx-secondary)" }}>Working days</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-primary)" }}>{workDays}</span>
              </div>
              <div className="rail-stat-row" style={{ marginBottom: 0 }}>
                <span style={{ fontSize: 12.5, color: "var(--tx-secondary)" }}>Weekend</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-primary)" }}>Sat &amp; Sun</span>
              </div>
            </div>

            <div className="rail-card anim-up">
              <p className="section-title" style={{ marginBottom: 12 }}>Month totals</p>
              {([
                ["Present", monthPresent, "var(--green)"],
                ["Half days", monthHalf, "var(--blue)"],
                ["Absent", monthAbsent, "var(--red)"],
                ["On leave", monthLeave, "var(--amber)"],
              ] as [string, number, string][]).map(([label, val, color]) => (
                <div key={label} className="rail-stat-row">
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--tx-secondary)" }}>
                    <span className="dot" style={{ background: color }} />{label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--tx-primary)" }}>{val}</span>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: "var(--tx-tertiary)" }}>Team attendance</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent)" }}>{monthRate}%</span>
                </div>
                <div className="progress-track" style={{ height: 7 }}>
                  <div className="progress-fill" style={{ width: `${monthRate}%` }} />
                </div>
              </div>
            </div>

            <div className="rail-card anim-up">
              <p className="section-title" style={{ marginBottom: 10 }}>Quick tips</p>
              <ul style={{ paddingLeft: 16, display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  "Day view is fastest for daily roll-call — one click per person.",
                  "“Mark all present” fills everyone shown, then fix the exceptions.",
                  "In the month grid, clicking a cell cycles through statuses.",
                  "Turn on bulk edit to select many cells and apply one status.",
                ].map((tip) => (
                  <li key={tip} style={{ fontSize: 12, color: "var(--tx-secondary)", lineHeight: 1.5 }}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
