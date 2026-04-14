"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type CT = { status:string;title:string;completedAt?:string;client:{name:string;company?:string} };
type Stat = { id:string;name:string;email:string;department:string;position:string;status:string;internal:{total:number;completed:number};client:{total:number;completed:number;failed:number;changes:number;pending:number};clientTasks:CT[] };

const S_BADGE: Record<string,string> = { COMPLETED:"badge-green",PENDING:"badge-gray",IN_PROGRESS:"badge-blue",CHANGES_REQUIRED:"badge-amber",OVERDUE:"badge-red" };
const S_LABEL: Record<string,string> = { COMPLETED:"Done",PENDING:"Pending",IN_PROGRESS:"Active",CHANGES_REQUIRED:"Changes",OVERDUE:"Overdue" };

export default function PerformancePage() {
  const [stats,setStats] = useState<Stat[]>([]);
  const [loading,setLoading] = useState(true);
  const [expanded,setExpanded] = useState<string|null>(null);
  const [search,setSearch] = useState("");

  useEffect(()=>{
    fetch("/api/employees/stats").then(r=>r.json()).then(d=>{setStats(Array.isArray(d)?d:[]);setLoading(false);});
  },[]);

  const filtered = stats.filter(e=>e.name.toLowerCase().includes(search.toLowerCase())||e.department.toLowerCase().includes(search.toLowerCase()));
  const totals = { tasks:stats.reduce((s,e)=>s+e.client.total,0), done:stats.reduce((s,e)=>s+e.client.completed,0), changes:stats.reduce((s,e)=>s+e.client.changes,0), failed:stats.reduce((s,e)=>s+e.client.failed,0) };

  return (
    <div className="page-section">
      <style>{`.tbl tbody tr:hover .row-actions{opacity:1!important}`}</style>
      <div style={{marginBottom:28}} className="anim-up">
        <h1 className="page-title">Performance</h1>
        <p style={{fontSize:13.5,color:"var(--tx-tertiary)",marginTop:5}}>Client task completion rates per employee</p>
      </div>

      {/* Summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
        {[["Assigned",totals.tasks,"var(--tx-primary)"],["Completed",totals.done,"var(--green)"],["Changes",totals.changes,"var(--amber)"],["Failed",totals.failed,"var(--red)"]].map(([l,v,c])=>(
          <div key={l as string} className="stat-card">
            <p className="label-text" style={{marginBottom:10}}>{l}</p>
            <p className="stat-value" style={{color:c as string}}>{v}</p>
          </div>
        ))}
      </div>

      <div className="search-wrap" style={{maxWidth:280,marginBottom:16}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter by name or department…"/>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        {loading?(
          <div className="empty"><div className="spinner"/></div>
        ):filtered.length===0?(
          <div className="empty"><p style={{fontWeight:600,color:"var(--tx-secondary)"}}>No employees found</p></div>
        ):(
          <table className="tbl">
            <thead>
              <tr><th>Employee</th><th>Department</th><th>Client tasks</th><th>Done</th><th>Changes</th><th>Failed</th><th>Rate</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(emp=>{
                const rate=emp.client.total>0?Math.round((emp.client.completed/emp.client.total)*100):0;
                const rateColor=rate>=80?"var(--green)":rate>=50?"var(--amber)":"var(--red)";
                const isExp=expanded===emp.id;
                return (
                  <>
                    <tr key={emp.id}>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div className="avatar">{emp.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}</div>
                          <div>
                            <Link href={`/dashboard/employees/${emp.id}`} style={{fontSize:13.5,fontWeight:500,color:"var(--tx-primary)",textDecoration:"none"}}
                              onMouseEnter={e=>(e.currentTarget.style.color="var(--accent)")} onMouseLeave={e=>(e.currentTarget.style.color="var(--tx-primary)")}>
                              {emp.name}
                            </Link>
                            <p style={{fontSize:12,color:"var(--tx-tertiary)"}}>{emp.position}</p>
                          </div>
                        </div>
                      </td>
                      <td><span style={{fontSize:13,color:"var(--tx-secondary)",padding:"2px 8px",borderRadius:"var(--r-sm)",background:"var(--hover-bg)"}}>{emp.department}</span></td>
                      <td style={{fontSize:13.5,fontWeight:500,color:"var(--tx-primary)"}}>{emp.client.total}</td>
                      <td><span className="badge badge-green">{emp.client.completed}</span></td>
                      <td><span className="badge badge-amber">{emp.client.changes}</span></td>
                      <td><span className="badge badge-red">{emp.client.failed}</span></td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{flex:1,height:4,background:"var(--hover-bg)",borderRadius:2,overflow:"hidden",maxWidth:60}}>
                            <div style={{height:"100%",background:rateColor,width:`${rate}%`,borderRadius:2,transition:"width .6s"}}/>
                          </div>
                          <span style={{fontSize:12.5,fontWeight:600,color:rateColor,minWidth:32}}>{rate}%</span>
                        </div>
                      </td>
                      <td>
                        {emp.client.total>0&&(
                          <button className="btn-ghost btn-icon" onClick={()=>setExpanded(isExp?null:emp.id)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{transform:isExp?"rotate(180deg)":"none",transition:"transform .2s"}}>
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExp&&(
                      <tr key={`${emp.id}-exp`}>
                        <td colSpan={8} style={{background:"var(--hover-bg)",padding:"12px 14px 14px 56px"}}>
                          <p className="label-text" style={{marginBottom:8}}>Client tasks breakdown</p>
                          <div style={{display:"flex",flexDirection:"column",gap:4}}>
                            {emp.clientTasks.map((ct,i)=>(
                              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"var(--card-bg)",borderRadius:"var(--r-md)",border:"1px solid var(--border)"}}>
                                <span className={`badge ${S_BADGE[ct.status]||"badge-gray"}`}>{S_LABEL[ct.status]||ct.status}</span>
                                <span style={{fontSize:13,color:"var(--tx-primary)",flex:1}}>{ct.title}</span>
                                <span style={{fontSize:12,color:"var(--tx-tertiary)"}}>{ct.client.company||ct.client.name}</span>
                                {ct.completedAt&&<span style={{fontSize:11.5,color:"var(--green)"}}>✓ {new Date(ct.completedAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
