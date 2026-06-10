"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

type Task = { id: string; status: string };
type Employee = { id: string; name: string; email: string; phone?: string; department: string; position: string; status: string; portalEnabled: boolean; joinedAt: string; tasks: Task[] };

const DEPTS    = ["Engineering","Design","Marketing","Sales","HR","Finance","Operations"];
const STATUSES = ["ACTIVE","INACTIVE","ON_LEAVE"];
const S_BADGE: Record<string,string>  = { ACTIVE:"badge-green", INACTIVE:"badge-red", ON_LEAVE:"badge-amber" };
const S_LABEL: Record<string,string>  = { ACTIVE:"Active", INACTIVE:"Inactive", ON_LEAVE:"On leave" };

// Employee birthdays (DD/MM/YYYY)
const EMPLOYEE_BIRTHDAYS: Record<string, string> = {
  "Simran Singh":          "17/10/2001",
  "Ayan Pakhira":          "19/07/1995",
  "Ashutosh Bhaskar":      "31/03/1997",
  "Arindam Biswas":        "28/10/2003",
  "Ritik Singh":           "20/08/2001",
  "Riya Kashyap":          "09/05/1999",
  "Ashlesha Kadwey":       "15/06/2002",
  "Pankaj Chandrawanshi":  "25/01/2000",
};

type BirthdayStatus = "today" | "tomorrow" | null;

function getBirthdayStatus(name: string): BirthdayStatus {
  const dob = EMPLOYEE_BIRTHDAYS[name];
  if (!dob) return null;

  const [dd, mm] = dob.split("/").map(Number);
  const now      = new Date();

  const today     = { d: now.getDate(),                          m: now.getMonth() + 1 };
  const tmrw      = new Date(now); tmrw.setDate(tmrw.getDate() + 1);
  const tomorrow  = { d: tmrw.getDate(),                         m: tmrw.getMonth() + 1 };

  if (dd === today.d    && mm === today.m)    return "today";
  if (dd === tomorrow.d && mm === tomorrow.m) return "tomorrow";
  return null;
}

function getBirthdayAlerts(): { name: string; status: BirthdayStatus }[] {
  return Object.keys(EMPLOYEE_BIRTHDAYS)
    .map(name => ({ name, status: getBirthdayStatus(name) }))
    .filter(b => b.status !== null);
}

function Modal({ emp, onClose, onSave }: { emp?: Employee|null; onClose:()=>void; onSave:()=>void }) {
  const [f, setF] = useState({ name:emp?.name||"", email:emp?.email||"", phone:emp?.phone||"", department:emp?.department||DEPTS[0], position:emp?.position||"", status:emp?.status||"ACTIVE" });
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
  const Field = ({ k, l, req, type="text" }: { k: keyof typeof f; l: string; req?: boolean; type?: string }) => (
    <div>
      <label style={{ display:"block", fontSize:12.5, fontWeight:500, color:"var(--tx-secondary)", marginBottom:5 }}>{l}</label>
      <input className="input" type={type} required={req} value={f[k]} onChange={e => setF({...f,[k]:e.target.value})} placeholder={l.replace(" *","")} />
    </div>
  );
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
              <div style={{ gridColumn:"1/-1" }}><Field k="name" l="Full name" req /></div>
              <div style={{ gridColumn:"1/-1" }}><Field k="email" l="Email" req type="email" /></div>
              <Field k="phone" l="Phone" />
              <div>
                <label style={{ display:"block", fontSize:12.5, fontWeight:500, color:"var(--tx-secondary)", marginBottom:5 }}>Status</label>
                <select className="input" value={f.status} onChange={e => setF({...f, status:e.target.value})}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontSize:12.5, fontWeight:500, color:"var(--tx-secondary)", marginBottom:5 }}>Department *</label>
                <select className="input" required value={f.department} onChange={e => setF({...f, department:e.target.value})}>
                  {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <Field k="position" l="Position" req />
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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [modal, setModal] = useState<"add"|"edit"|"delete"|null>(null);
  const [selected, setSelected] = useState<Employee|null>(null);
  const [birthdayAlerts, setBirthdayAlerts] = useState<{ name: string; status: BirthdayStatus }[]>([]);

  useEffect(() => {
    setBirthdayAlerts(getBirthdayAlerts());
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams(); if(search) p.set("search",search); if(dept) p.set("department",dept);
    const res = await fetch(`/api/employees?${p}`);
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search, dept]);

  useEffect(() => { const t = setTimeout(fetchEmployees, 300); return () => clearTimeout(t); }, [fetchEmployees]);

  const todayBirthdays    = birthdayAlerts.filter(b => b.status === "today");
  const tomorrowBirthdays = birthdayAlerts.filter(b => b.status === "tomorrow");

  return (
    <div className="page-section">
      <style>{`
        .tbl tbody tr:hover .row-actions{opacity:1!important}

        @keyframes bday-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
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
        .bday-emoji    { font-size: 30px; flex-shrink: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,.18)); }
        .bday-emoji-sm { font-size: 22px; flex-shrink: 0; }
        .bday-names-today    { font-size: 15px; font-weight: 700; color: #fff; line-height: 1.4; }
        .bday-sub-today      { font-size: 12px; color: rgba(255,255,255,.78); margin-top: 2px; }
        .bday-names-tomorrow { font-size: 14px; font-weight: 600; color: var(--tx-primary); line-height: 1.4; }
        .bday-sub-tomorrow   { font-size: 12px; color: var(--tx-tertiary); margin-top: 2px; }
        .bday-pill {
          margin-left: auto; flex-shrink: 0;
          font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
          padding: 4px 10px; border-radius: 20px;
          background: rgba(255,255,255,.22); color: #fff;
        }
        .bday-pill-tomorrow {
          margin-left: auto; flex-shrink: 0;
          font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
          padding: 4px 10px; border-radius: 20px;
          background: rgba(124,58,237,.14); color: var(--accent);
        }
        .bday-row-highlight { background: linear-gradient(90deg, rgba(124,58,237,.06) 0%, transparent 100%) !important; }
      `}</style>

      {/* ── Birthday Banners ─────────────────────────────────── */}
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
                <span key={b.name}>{b.name}{i < tomorrowBirthdays.length - 1 ? " & " : ""}</span>
              ))}
              {tomorrowBirthdays.length === 1 ? "'s" : "'"} birthday is tomorrow!
            </p>
            <p className="bday-sub-tomorrow">Don't forget to wish them 🎈</p>
          </div>
          <span className="bday-pill-tomorrow">Tomorrow</span>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }} className="anim-up">
        <div>
          <h1 className="page-title">Employees</h1>
          <p style={{ fontSize:13.5, color:"var(--tx-tertiary)", marginTop:5 }}>{employees.length} people · {employees.filter(e=>e.status==="ACTIVE").length} active</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelected(null); setModal("add"); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add employee
        </button>
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <div className="search-wrap" style={{ flex:1, maxWidth:280 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" />
        </div>
        <select className="input" value={dept} onChange={e => setDept(e.target.value)} style={{ width:"auto", maxWidth:160 }}>
          <option value="">All departments</option>
          {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="card" style={{ overflow:"hidden" }}>
        {loading ? (
          <div className="empty"><div className="spinner" /></div>
        ) : employees.length === 0 ? (
          <div className="empty">
            <p style={{ fontSize:18, marginBottom:6 }}>👥</p>
            <p style={{ fontWeight:600, color:"var(--tx-secondary)" }}>No employees found</p>
            <p style={{ fontSize:13 }}>Try a different search or add your first team member</p>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Name</th><th>Department</th><th>Status</th><th>Tasks</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const done    = emp.tasks.filter(t => t.status === "COMPLETED").length;
                const bdayStatus = getBirthdayStatus(emp.name);

                return (
                  <tr
                    key={emp.id}
                    className={bdayStatus === "today" ? "bday-row-highlight" : undefined}
                  >
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div
                          className="avatar"
                          style={bdayStatus === "today"
                            ? { background:"linear-gradient(135deg,#7c3aed,#ec4899)", color:"#fff" }
                            : undefined}
                        >
                          {emp.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}
                        </div>
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <Link
                              href={`/dashboard/employees/${emp.id}`}
                              style={{ fontSize:13.5, fontWeight:500, color:"var(--tx-primary)", textDecoration:"none" }}
                              onMouseEnter={e=>(e.currentTarget.style.color="var(--accent)")}
                              onMouseLeave={e=>(e.currentTarget.style.color="var(--tx-primary)")}
                            >
                              {emp.name}
                            </Link>
                            {bdayStatus === "today"    && <span style={{ fontSize:14, lineHeight:1 }}>🎂</span>}
                            {bdayStatus === "tomorrow" && <span style={{ fontSize:13, lineHeight:1 }}>🎁</span>}
                            {emp.portalEnabled && <span className="badge badge-blue" style={{ fontSize:10 }}>Portal</span>}
                          </div>
                          <p style={{ fontSize:12, color:"var(--tx-tertiary)" }}>{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize:13, color:"var(--tx-secondary)", padding:"2px 8px", borderRadius:"var(--r-sm)", background:"var(--hover-bg)" }}>{emp.department}</span>
                    </td>
                    <td><span className={`badge ${S_BADGE[emp.status]||"badge-gray"}`}>{S_LABEL[emp.status]||emp.status}</span></td>
                    <td>
                      <span style={{ fontSize:13.5, fontWeight:500, color:"var(--tx-primary)" }}>{done}</span>
                      <span style={{ fontSize:12, color:"var(--tx-tertiary)" }}> / {emp.tasks.length}</span>
                    </td>
                    <td style={{ fontSize:12.5, color:"var(--tx-tertiary)" }}>{formatDate(emp.joinedAt)}</td>
                    <td>
                      <div className="row-actions" style={{ display:"flex", gap:2, justifyContent:"flex-end" }}>
                        <Link href={`/dashboard/employees/${emp.id}`} className="btn-ghost btn-icon" title="View">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Link>
                        <Link href={`/dashboard/employees/${emp.id}/attendance`} className="btn-ghost btn-icon" title="Attendance">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </Link>
                        <button className="btn-ghost btn-icon" title="Edit" onClick={() => { setSelected(emp); setModal("edit"); }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-ghost btn-icon" title="Delete" onClick={() => { setSelected(emp); setModal("delete"); }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {(modal==="add"||modal==="edit") && <Modal emp={modal==="edit"?selected:null} onClose={()=>setModal(null)} onSave={fetchEmployees}/>}
      {modal==="delete" && selected && <DeleteModal emp={selected} onClose={()=>setModal(null)} onDelete={fetchEmployees}/>}
    </div>
  );
}