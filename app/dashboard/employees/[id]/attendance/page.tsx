"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type AS = "PRESENT"|"ABSENT"|"HALF_DAY"|"LEAVE"|"HOLIDAY"|"WEEKEND";
type AR = { id:string; date:string; status:AS; note?:string };
type Emp = { id:string; name:string; department:string; position:string };

const CFG: Record<AS,{label:string;short:string;bg:string;color:string;dot:string}> = {
  PRESENT:  {label:"Present",  short:"P",  bg:"rgba(255,255,255,0.95)", color:"#060606", dot:"#fff"},
  ABSENT:   {label:"Absent",   short:"A",  bg:"rgba(239,68,68,0.15)",  color:"#ef4444", dot:"#ef4444"},
  HALF_DAY: {label:"Half Day", short:"½",  bg:"rgba(136,136,136,0.15)",color:"#888",    dot:"#666"},
  LEAVE:    {label:"Leave",    short:"L",  bg:"rgba(245,158,11,0.15)", color:"#f59e0b", dot:"#f59e0b"},
  HOLIDAY:  {label:"Holiday",  short:"H",  bg:"rgba(80,80,80,0.2)",    color:"#555",    dot:"#444"},
  WEEKEND:  {label:"Weekend",  short:"W",  bg:"transparent",            color:"#1e1e1e", dot:"#1a1a1a"},
};

const STATUSES: AS[] = ["PRESENT","ABSENT","HALF_DAY","LEAVE","HOLIDAY"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function pad(n:number){return String(n).padStart(2,"0");}
function dk(d:Date){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}

export default function AttendancePage() {
  const { id } = useParams<{id:string}>();
  const today = new Date();

  const [emp, setEmp] = useState<Emp|null>(null);
  const [records, setRecords] = useState<Map<string,AR>>(new Map());
  const [yr, setYr] = useState(today.getFullYear());
  const [mo, setMo] = useState(today.getMonth()+1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string|null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<AS>("PRESENT");

  useEffect(() => { fetch(`/api/employees/${id}`).then(r=>r.json()).then(setEmp).catch(console.error); }, [id]);

  const fetchAtt = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/attendance/${id}?year=${yr}&month=${mo}`);
    const data: AR[] = await res.json();
    const map = new Map<string,AR>();
    data.forEach(r => map.set(r.date.split("T")[0], r));
    setRecords(map);
    setLoading(false);
  }, [id, yr, mo]);

  useEffect(()=>{fetchAtt();},[fetchAtt]);

  async function markDay(dateStr:string, status:AS) {
    setSaving(dateStr);
    await fetch(`/api/attendance/${id}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({date:dateStr,status}) });
    await fetchAtt();
    setSaving(null);
  }

  async function bulkMark() {
    if (!selected.size) return;
    setSaving("bulk");
    await Promise.all([...selected].map(d => fetch(`/api/attendance/${id}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({date:d,status:bulkStatus})})));
    await fetchAtt();
    setSelected(new Set());
    setSaving(null);
  }

  const daysInMonth = new Date(yr,mo,0).getDate();
  const firstDay = new Date(yr,mo-1,1).getDay();
  const todayKey = dk(today);

  const cells = Array.from({length:daysInMonth},(_,i)=>{
    const day=i+1, d=new Date(yr,mo-1,day), k=dk(d), dow=d.getDay();
    const isWeekend=dow===0;
    return { day, k, isWeekend, isToday:k===todayKey, isFuture:d>today, rec:records.get(k), status:records.get(k)?.status||(isWeekend?"WEEKEND":undefined) };
  });

  const present=   [...records.values()].filter(r=>r.status==="PRESENT").length;
  const absent=    [...records.values()].filter(r=>r.status==="ABSENT").length;
  const halfDay=   [...records.values()].filter(r=>r.status==="HALF_DAY").length;
  const leave=     [...records.values()].filter(r=>r.status==="LEAVE").length;
  const holiday=   [...records.values()].filter(r=>r.status==="HOLIDAY").length;
  const workDays=  cells.filter(c=>!c.isWeekend).length;
  const effective= present+halfDay;
  const rate= workDays>0 ? Math.round((effective/workDays)*100):0;

  function prevMonth(){if(mo===1){setYr(y=>y-1);setMo(12);}else setMo(m=>m-1);setSelected(new Set());}
  function nextMonth(){if(mo===12){setYr(y=>y+1);setMo(1);}else setMo(m=>m+1);setSelected(new Set());}

  return (
    <div style={{ padding:"40px 36px", maxWidth:1100, margin:"0 auto" }}>
      <Link href={`/dashboard/employees/${id}`}
        style={{ display:"inline-flex", alignItems:"center", gap:6, color:"var(--text-2)", fontSize:12, textDecoration:"none", marginBottom:28, transition:"color .12s" }}
        onMouseEnter={e=>e.currentTarget.style.color="var(--text-0)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text-2)"}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        Back
      </Link>

      <div className="page-header" style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
        <div>
          <p className="label" style={{ marginBottom:6 }}>{emp ? `${emp.name} · ${emp.department}` : "Employee"}</p>
          <h1 className="display page-title">ATTENDANCE</h1>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button className="btn-ghost btn-icon" onClick={prevMonth}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ textAlign:"center", minWidth:120 }}>
            <p style={{ fontSize:13, fontWeight:500, color:"var(--text-0)" }}>{MONTHS[mo-1]} {yr}</p>
            <p style={{ fontSize:10, color:"var(--text-2)" }}>{workDays} working days</p>
          </div>
          <button className="btn-ghost btn-icon" onClick={nextMonth}
            disabled={yr===today.getFullYear()&&mo===today.getMonth()+1}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:20 }}>
        {[
          {label:"Present",  val:present,  dot:"#fff"},
          {label:"Absent",   val:absent,   dot:"#ef4444"},
          {label:"Half Day", val:halfDay,  dot:"#666"},
          {label:"Leave",    val:leave,    dot:"#f59e0b"},
          {label:"Holiday",  val:holiday,  dot:"#444"},
          {label:"Worked",   val:`${effective}/${workDays}`, dot:"#555"},
        ].map(({label,val,dot}) => (
          <div key={label} className="stat-card">
            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8 }}>
              <div className="dot" style={{ background:dot, width:5, height:5 }}/>
              <p className="label">{label}</p>
            </div>
            <p className="display" style={{ fontSize:32, color:"var(--text-0)" }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="card" style={{ padding:"12px 16px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <p style={{ fontSize:12, color:"var(--text-1)" }}>Attendance rate</p>
          <p style={{ fontSize:13, fontWeight:600, color:"var(--text-0)" }}>{rate}%</p>
        </div>
        <div className="progress-track" style={{ height:3 }}>
          <div style={{ display:"flex", height:"100%" }}>
            <div style={{ width:`${(present/workDays)*100}%`, background:"#fff", transition:"width .7s" }}/>
            <div style={{ width:`${(halfDay/workDays)*100}%`, background:"#666", transition:"width .7s" }}/>
            <div style={{ width:`${(leave/workDays)*100}%`, background:"#f59e0b", transition:"width .7s" }}/>
            <div style={{ width:`${(absent/workDays)*100}%`, background:"#ef4444", transition:"width .7s" }}/>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <button className={`btn ${bulkMode ? "btn-primary" : "btn-secondary"} btn-sm`}
          onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }}>
          {bulkMode ? `${selected.size} selected` : "Bulk Edit"}
        </button>
        {bulkMode && (
          <>
            <select className="input" value={bulkStatus} onChange={e=>setBulkStatus(e.target.value as AS)}
              style={{ width:"auto", padding:"5px 10px", fontSize:12, height:"auto" }}>
              {STATUSES.map(s => <option key={s} value={s}>{CFG[s].label}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={bulkMark}
              disabled={selected.size===0||saving==="bulk"}>
              {saving==="bulk" ? <span className="spinner" style={{width:11,height:11}}/> : null}
              Apply to {selected.size}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => {setSelected(new Set());setBulkMode(false);}}>Cancel</button>
          </>
        )}
        {!bulkMode && (
          <div style={{ marginLeft:"auto", display:"flex", gap:12, flexWrap:"wrap" }}>
            {STATUSES.map(s => (
              <div key={s} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div className="dot" style={{ background:CFG[s].dot, width:5, height:5 }}/>
                <span style={{ fontSize:10, color:"var(--text-2)" }}>{CFG[s].label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="card" style={{ overflow:"hidden" }}>
        {/* Day headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"1px solid var(--border-0)" }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} style={{ padding:"10px 0", textAlign:"center", fontSize:10, color:"var(--text-2)", letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:500 }}>{d}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60 }}>
            <div className="spinner"/>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
            {Array.from({length:firstDay},(_,i) => (
              <div key={`e${i}`} className="cal-cell" style={{ borderRight:"1px solid #0a0a0a", borderBottom:"1px solid #0a0a0a" }}/>
            ))}
            {cells.map(({day,k,isWeekend,isToday,isFuture,status}) => {
              const cfg = status ? CFG[status] : null;
              const isSel = selected.has(k);
              const colIdx = (firstDay+day-1)%7;
              const lastCol = colIdx===6;
              const isSaving = saving===k;

              return (
                <div key={k} className="cal-cell"
                  style={{
                    borderRight: lastCol ? "none" : "1px solid #0a0a0a",
                    borderBottom: "1px solid #0a0a0a",
                    background: isSel ? "var(--surface-3)" : isToday ? "var(--surface-2)" : undefined,
                    cursor: (isFuture||isWeekend) ? "default" : "pointer",
                    opacity: isWeekend ? 0.35 : 1,
                  }}>
                  {/* Day number */}
                  <div style={{ display:"flex", alignItems:"start", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{
                      fontSize:12, fontWeight:isToday?600:400,
                      color:isWeekend?"var(--text-3)":isToday?"var(--text-0)":"var(--text-1)",
                      ...(isToday ? { width:20,height:20,background:"#fff",color:"#060606",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10 } : {}),
                    }}>{day}</span>
                    {isSel && (
                      <div style={{ width:12,height:12,background:"#fff",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#060606" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                    {isSaving && <div className="spinner" style={{width:10,height:10}}/>}
                  </div>

                  {cfg && (
                    <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:9,fontWeight:700,letterSpacing:"0.04em",padding:"2px 5px",borderRadius:3,background:cfg.bg,color:cfg.color }}>
                      {cfg.short}
                    </span>
                  )}

                  {/* Hover picker */}
                  {!isFuture && !isWeekend && (
                    <div className="cal-picker"
                      onClick={e => { e.stopPropagation(); if (bulkMode) { setSelected(prev => { const s=new Set(prev); s.has(k)?s.delete(k):s.add(k); return s; }); } }}>
                      {bulkMode ? (
                        <div style={{ gridColumn:"span 3", display:"flex",alignItems:"center",justifyContent:"center" }}>
                          <p style={{ fontSize:9,color:"var(--text-1)",textAlign:"center" }}>{isSel?"✓ selected":"click to select"}</p>
                        </div>
                      ) : STATUSES.map(s => (
                        <button key={s} className="cal-pick-btn" onClick={()=>markDay(k,s)}
                          style={{ background:CFG[s].bg, color:CFG[s].color }}>
                          {CFG[s].short}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="card" style={{ marginTop:20, overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--border-0)" }}>
          <p className="section-title">Monthly Summary — {MONTHS[mo-1]} {yr}</p>
        </div>
        {[
          ["Working Days", workDays, "Mon – Sat"],
          ["Days Present", present, "full attendance"],
          ["Half Days", halfDay, `= ${halfDay*0.5} days`],
          ["Days on Leave", leave, "approved"],
          ["Days Absent", absent, "no show"],
          ["Holidays", holiday, "marked"],
          ["Effective Days", effective, `of ${workDays}`],
          ["Attendance Rate", `${rate}%`, ""],
        ].map(([label,val,sub]) => (
          <div key={label as string} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 20px",borderBottom:"1px solid var(--border-0)" }}>
            <div>
              <p style={{ fontSize:13,color:"var(--text-1)" }}>{label}</p>
              {sub && <p style={{ fontSize:11,color:"var(--text-2)" }}>{sub}</p>}
            </div>
            <p className="display" style={{ fontSize:24, color:"var(--text-0)" }}>{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
