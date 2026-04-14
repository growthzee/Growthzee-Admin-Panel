"use client";
import { getCategoryEmoji, getSubCategoryEmoji } from "@/lib/taskCategories";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

type ITask = { id:string;title:string;description?:string;category?:string|null;subCategory?:string|null;taskType?:string|null;status:string;priority:string;startDate:string;endDate:string;completedAt?:string;createdAt:string;_type:"internal" };
type CTask = { id:string;title:string;description?:string;category?:string|null;subCategory?:string|null;taskType?:string|null;status:string;priority:string;startDate:string;endDate:string;completedAt?:string;createdAt:string;_type:"client";client:{id:string;name:string;company?:string} };
type AnyTask = ITask | CTask;
type Employee = { id:string;name:string;email:string;department:string;position:string;tasks:Omit<ITask,"_type">[];clientTasks:Omit<CTask,"_type">[] };

const SC: Record<string, {label:string;dot:string;text:string}> = {
  PENDING:          {label:"Pending",    dot:"#2a2a2a", text:"var(--text-2)"},
  IN_PROGRESS:      {label:"In Progress",dot:"#888",    text:"var(--text-1)"},
  COMPLETED:        {label:"Done",       dot:"#fff",    text:"var(--text-0)"},
  CHANGES_REQUIRED: {label:"Changes",    dot:"#f59e0b", text:"#f59e0b"},
  OVERDUE:          {label:"Overdue",    dot:"#ef4444", text:"#ef4444"},
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function pad(n: number) { return String(n).padStart(2,"0"); }
function dk(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

function Calendar({ tasks }: { tasks: AnyTask[] }) {
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sel, setSel] = useState<string|null>(null);
  const y = view.getFullYear(), m = view.getMonth();
  const firstDay = new Date(y,m,1).getDay();
  const days = new Date(y,m+1,0).getDate();
  const todayKey = dk(today);

  const map: Record<string,AnyTask[]> = {};
  tasks.forEach(t => {
    for (let d = new Date(t.startDate); d <= new Date(t.endDate); d.setDate(d.getDate()+1)) {
      if (d.getFullYear()===y && d.getMonth()===m) {
        const k = dk(new Date(d));
        if (!map[k]) map[k] = [];
        map[k].push(t);
      }
    }
  });

  return (
    <div className="card" style={{ padding: 16, position: "sticky", top: 68 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-0)" }}>{MONTHS[m].slice(0,3)} {y}</p>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => { setView(new Date(y,m-1,1)); setSel(null); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button className="btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => { setView(new Date(y,m+1,1)); setSel(null); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {["S","M","T","W","T","F","S"].map((d,i) => <div key={i} style={{ textAlign:"center", fontSize:9, color:"var(--text-3)", paddingBottom:4 }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {Array.from({length:firstDay},(_,i) => <div key={`e${i}`}/>)}
        {Array.from({length:days},(_,i) => {
          const day = i+1;
          const k = `${y}-${pad(m+1)}-${pad(day)}`;
          const dt = map[k] || [];
          const isToday = k === todayKey;
          const isSel = k === sel;
          const hasOverdue = dt.some(t=>t.status==="OVERDUE");
          const hasActive = dt.some(t=>t.status==="IN_PROGRESS");
          const hasDone = dt.some(t=>t.status==="COMPLETED");
          const dotColor = hasOverdue ? "#ef4444" : hasActive ? "#888" : hasDone ? "#fff" : "#444";
          return (
            <button key={k} onClick={() => setSel(isSel ? null : k)}
              style={{
                position:"relative", height:28, border:"none", borderRadius:5, cursor:"pointer",
                fontSize:11, fontWeight:500, transition:"all .12s",
                background: isSel ? "#fff" : isToday ? "var(--surface-3)" : "transparent",
                color: isSel ? "#060606" : isToday ? "var(--text-0)" : dt.length > 0 ? "var(--text-1)" : "var(--text-3)",
              }}>
              {day}
              {dt.length > 0 && (
                <span style={{ position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background: isSel ? "#333" : dotColor }} />
              )}
            </button>
          );
        })}
      </div>

      {sel && map[sel] && (
        <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid var(--border-0)" }}>
          <p className="label" style={{ marginBottom:6 }}>{new Date(sel+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</p>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {map[sel].map(t => {
              const sc = SC[t.status] || SC.PENDING;
              return (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 8px", background:"var(--surface-2)", borderRadius:6 }}>
                  <div className="dot" style={{ background:sc.dot, width:5, height:5 }}/>
                  <p style={{ fontSize:11, color:"var(--text-0)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onUpdate }: { task: AnyTask; onUpdate: (id:string,status:string,type:string)=>void }) {
  const sc = SC[task.status] || SC.PENDING;
  const isClient = task._type === "client";
  const [upd, setUpd] = useState(false);
  const overdue = new Date(task.endDate) < new Date() && task.status !== "COMPLETED";
  const statuses = isClient ? ["PENDING","IN_PROGRESS","COMPLETED","CHANGES_REQUIRED","OVERDUE"] : ["PENDING","IN_PROGRESS","COMPLETED","OVERDUE"];

  async function set(s: string) { setUpd(true); await onUpdate(task.id, s, task._type); setUpd(false); }

  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div style={{ display:"flex", gap:10 }}>
        <div className="dot" style={{ background:sc.dot, marginTop:5, flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, fontWeight:500, color:task.status==="COMPLETED"?"var(--text-2)":"var(--text-0)", textDecoration:task.status==="COMPLETED"?"line-through":"none" }}>{task.title}</span>
            {isClient && "client" in task && (
              <span className="badge badge-muted" style={{ fontSize:10 }}>{task.client.company||task.client.name}</span>
            )}
          </div>
          {task.description && <p style={{ fontSize:12, color:"var(--text-2)", marginBottom:6 }}>{task.description}</p>}
          <p style={{ fontSize:11, color:"var(--text-2)", marginBottom:10 }}>
            {formatDate(task.startDate)} → <span style={{ color:overdue?"#ef4444":"var(--text-2)" }}>{formatDate(task.endDate)}{overdue?" ⚠":""}</span>
            {task.completedAt && <span style={{ color:"#fff", marginLeft:8 }}>✓ {formatDate(task.completedAt)}</span>}
          </p>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", color:sc.text }}>{sc.label}</span>
            {task.status !== "COMPLETED" && (
              <button className="btn btn-primary btn-sm" onClick={() => set("COMPLETED")} disabled={upd} style={{ padding:"4px 12px" }}>
                {upd ? <span className="spinner" style={{width:11,height:11}} /> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                Complete
              </button>
            )}
            {task.status !== "IN_PROGRESS" && task.status !== "COMPLETED" && (
              <button className="btn btn-secondary btn-sm" onClick={() => set("IN_PROGRESS")} disabled={upd} style={{ padding:"4px 10px" }}>Start</button>
            )}
            {task.status !== "COMPLETED" && (
              <select value={task.status} onChange={e=>set(e.target.value)} disabled={upd}
                className="input" style={{ width:"auto", padding:"4px 8px", fontSize:11, height:"auto" }}>
                {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmployeePortalPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee|null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all"|"internal"|"client">("all");
  const [sf, setSf] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/employee-portal/me");
    if (!r.ok) { router.push("/employee-login"); return; }
    setEmployee(await r.json()); setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function updateTask(id:string, status:string, type:string) {
    await fetch(`/api/employee-portal/tasks/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status,type}) });
    load();
  }

  async function logout() { await fetch("/api/employee-portal/logout",{method:"POST"}); router.push("/employee-login"); router.refresh(); }

  if (loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div className="spinner"/></div>;
  if (!employee) return null;

  const internal: AnyTask[] = employee.tasks.map(t=>({...t,_type:"internal"as const}));
  const client: AnyTask[]   = employee.clientTasks.map(t=>({...t,_type:"client"as const}));
  const all = [...internal,...client];
  const byTab = tab==="internal" ? internal : tab==="client" ? client : all;
  const visible = sf ? byTab.filter(t=>t.status===sf) : byTab;

  const done = all.filter(t=>t.status==="COMPLETED").length;
  const inProg = all.filter(t=>t.status==="IN_PROGRESS").length;
  const pend = all.filter(t=>t.status==="PENDING").length;
  const over = all.filter(t=>t.status==="OVERDUE").length;
  const rate = all.length > 0 ? Math.round((done/all.length)*100) : 0;

  return (
    <div style={{ minHeight:"100vh" }}>
      <header style={{ borderBottom:"1px solid var(--border-0)", padding:"0 28px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"var(--surface-0)", zIndex:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div className="avatar" style={{ width:28, height:28, fontSize:10 }}>
            {employee.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}
          </div>
          <div>
            <span style={{ fontSize:13, fontWeight:500, color:"var(--text-0)" }}>{employee.name}</span>
            <span style={{ fontSize:11, color:"var(--text-2)", marginLeft:8 }}>{employee.position}</span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ display:"flex", gap:12 }}>
            {[[done,"Done"],[inProg,"Active"],[over,"Overdue"]].map(([v,l]) => (
              <span key={l as string} style={{ fontSize:11, color: l==="Overdue" && (v as number)>0 ? "#ef4444" : "var(--text-2)" }}>{v} {l}</span>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main style={{ maxWidth:1100, margin:"0 auto", padding:"40px 28px" }}>
        <div className="page-header">
          <p className="label" style={{ marginBottom:6 }}>Workspace</p>
          <h1 className="display page-title">MY TASKS</h1>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:20 }}>
          {[["Total",all.length],["Done",done],["Active",inProg],["Pending",pend],["Overdue",over]].map(([l,v]) => (
            <div key={l as string} className="stat-card">
              <p className="label" style={{ marginBottom:8 }}>{l}</p>
              <p className="stat-value" style={{ fontSize:36, color: l==="Overdue"&&(v as number)>0?"#ef4444":"var(--text-0)" }}>{v}</p>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding:"12px 16px", marginBottom:24 }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
            <p style={{ fontSize:12,color:"var(--text-1)" }}>Progress</p>
            <p style={{ fontSize:12,fontWeight:600,color:"var(--text-0)" }}>{rate}%</p>
          </div>
          <div className="progress-track">
            <div style={{ height:"100%",background:"#fff",width:`${rate}%`,transition:"width .7s cubic-bezier(.16,1,.3,1)" }}/>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 200px", gap:20 }}>
          <div>
            <div style={{ display:"flex",gap:8,marginBottom:12,flexWrap:"wrap" }}>
              {([["all","All",all.length],["internal","Internal",internal.length],["client","Client",client.length]] as const).map(([k,l,c]) => (
                <button key={k} className={`filter-tab${tab===k?" active":""}`} onClick={()=>{setTab(k);setSf("");}}>
                  {l} <span className="count">{c}</span>
                </button>
              ))}
            </div>
            <div style={{ display:"flex",gap:6,marginBottom:14,flexWrap:"wrap" }}>
              {[["","All",byTab.length],["PENDING","Pending",byTab.filter(t=>t.status==="PENDING").length],["IN_PROGRESS","Active",byTab.filter(t=>t.status==="IN_PROGRESS").length],["COMPLETED","Done",byTab.filter(t=>t.status==="COMPLETED").length],["OVERDUE","Overdue",byTab.filter(t=>t.status==="OVERDUE").length]].map(([k,l,c]) => (
                (c as number) > 0 || k==="" ? (
                  <button key={k as string} className={`filter-tab${sf===k?" active":""}`} onClick={()=>setSf(k as string)} style={{ fontSize:11,padding:"4px 10px" }}>
                    {l} <span className="count">{c}</span>
                  </button>
                ) : null
              ))}
            </div>
            {visible.length===0 ? (
              <div className="empty card"><p style={{ color:"var(--text-2)",fontSize:12 }}>No tasks here</p></div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {visible.map(t => <TaskCard key={`${t._type}-${t.id}`} task={t} onUpdate={updateTask}/>)}
              </div>
            )}
          </div>
          <Calendar tasks={all}/>
        </div>
      </main>
    </div>
  );
}
