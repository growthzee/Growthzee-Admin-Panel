"use client";
import { useState, useEffect } from "react";
import { getCategoryEmoji, getSubCategoryEmoji } from "@/lib/taskCategories";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

type Employee = { id:string;name:string;position:string };
type Task = { id:string;title:string;description?:string;category?:string|null;subCategory?:string|null;taskType?:string|null;status:string;priority:string;startDate:string;endDate:string;completedAt?:string;employee?:Employee|null };
type Client = { id:string;name:string;email:string;company?:string;clientTasks:Task[] };
const S_BADGE: Record<string,string> = { PENDING:"badge-gray",IN_PROGRESS:"badge-blue",COMPLETED:"badge-green",CHANGES_REQUIRED:"badge-amber",OVERDUE:"badge-red" };
const S_LABEL: Record<string,string> = { PENDING:"Pending",IN_PROGRESS:"In progress",COMPLETED:"Done",CHANGES_REQUIRED:"Changes needed",OVERDUE:"Overdue" };

export default function PortalPage() {
  const router = useRouter();
  const [client,setClient] = useState<Client|null>(null);
  const [loading,setLoading] = useState(true);
  const [filter,setFilter] = useState("");
  const [dark,setDark] = useState(false);

  useEffect(()=>{ setDark(document.documentElement.classList.contains("dark")); },[]);
  useEffect(()=>{
    fetch("/api/portal/me").then(r=>{if(!r.ok)throw new Error();return r.json();})
      .then(d=>{setClient(d);setLoading(false);}).catch(()=>router.push("/client-login"));
  },[router]);

  function toggleTheme(){const next=!dark;setDark(next);document.documentElement.classList.toggle("dark",next);try{localStorage.setItem("theme",next?"dark":"light");}catch{}}
  async function logout(){await fetch("/api/portal/logout",{method:"POST"});router.push("/client-login");router.refresh();}

  if (loading) return <div style={{minHeight:"100vh",background:"var(--page-bg)",display:"flex",alignItems:"center",justifyContent:"center"}}><div className="spinner"/></div>;
  if (!client) return null;

  const tasks = client.clientTasks;
  const counts = {total:tasks.length,done:tasks.filter(t=>t.status==="COMPLETED").length,active:tasks.filter(t=>t.status==="IN_PROGRESS").length,changes:tasks.filter(t=>t.status==="CHANGES_REQUIRED").length,pending:tasks.filter(t=>t.status==="PENDING").length,overdue:tasks.filter(t=>t.status==="OVERDUE").length};
  const rate = counts.total>0?Math.round((counts.done/counts.total)*100):0;
  const visible = filter?tasks.filter(t=>t.status===filter):tasks;

  return (
    <div style={{minHeight:"100vh",background:"var(--page-bg)"}}>
      <header style={{background:"var(--sidebar-bg)",borderBottom:"1px solid var(--border)",padding:"0 28px",height:50,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:26,height:26,borderRadius:6,background:"var(--tx-primary)",color:"var(--tx-inverse)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🤝</div>
          <span style={{fontSize:14,fontWeight:600,color:"var(--tx-primary)"}}>{client.company||client.name}</span>
          <span className="badge badge-gray" style={{fontSize:11}}>Client Portal</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button className="theme-btn" onClick={toggleTheme}>
            {dark?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main style={{maxWidth:860,margin:"0 auto",padding:"36px 24px"}}>
        <div style={{marginBottom:28}}>
          <h1 className="page-title">Your projects</h1>
          <p style={{fontSize:13.5,color:"var(--tx-tertiary)",marginTop:5}}>Live progress for all your tasks · Read-only</p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
          {[["Total",counts.total,"var(--tx-primary)"],["Done",counts.done,"var(--green)"],["Active",counts.active,"var(--blue)"],["Changes",counts.changes,"var(--amber)"],["Overdue",counts.overdue,"var(--red)"]].map(([l,v,c])=>(
            <div key={l as string} className="stat-card">
              <p className="label-text" style={{marginBottom:8}}>{l}</p>
              <p className="stat-value" style={{color:c as string,fontSize:26}}>{v}</p>
            </div>
          ))}
        </div>

        <div className="card" style={{padding:"14px 18px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <p style={{fontSize:13.5,fontWeight:500,color:"var(--tx-primary)"}}>Overall completion</p>
            <p style={{fontSize:13.5,fontWeight:700,color:"var(--accent)"}}>{rate}%</p>
          </div>
          <div className="progress-track" style={{height:6}}><div className="progress-fill" style={{width:`${rate}%`}}/></div>
        </div>

        <div className="filter-tabs-wrap" style={{marginBottom:14}}>
          {[["","All",counts.total],["PENDING","Pending",counts.pending],["IN_PROGRESS","Active",counts.active],["COMPLETED","Done",counts.done],["CHANGES_REQUIRED","Changes",counts.changes]].map(([k,l,c])=>(
            (c as number)>0||k===""?<button key={k as string} className={`filter-tab${filter===k?" active":""}`} onClick={()=>setFilter(k as string)}>{l}<span className="count">{c}</span></button>:null
          ))}
        </div>

        <div className="card" style={{overflow:"hidden"}}>
          {visible.length===0?<div className="empty"><p>No tasks in this filter</p></div>:visible.map(task=>{
            const overdue=new Date(task.endDate)<new Date()&&task.status!=="COMPLETED";
            return (
              <div key={task.id} style={{padding:"12px 18px",borderBottom:"1px solid var(--border)",display:"flex",gap:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                    <p style={{fontSize:13.5,fontWeight:500,color:task.status==="COMPLETED"?"var(--tx-tertiary)":"var(--tx-primary)",textDecoration:task.status==="COMPLETED"?"line-through":"none"}}>{task.title}</p>
                    <span className={`badge ${S_BADGE[task.status]||"badge-gray"}`}>{S_LABEL[task.status]||task.status}</span>
                  </div>
                  {task.category&&(
                    <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:11.5,padding:"2px 8px",borderRadius:"var(--r-sm)",background:"var(--accent-bg)",color:"var(--accent)",fontWeight:500}}>{getCategoryEmoji(task.category)} {task.category}</span>
                      {task.subCategory&&<span style={{fontSize:11.5,padding:"2px 8px",borderRadius:"var(--r-sm)",background:"var(--hover-bg)",color:"var(--tx-secondary)"}}>{getSubCategoryEmoji(task.category,task.subCategory)} {task.subCategory}</span>}
                      {task.taskType&&<span style={{fontSize:12,fontWeight:600,color:"var(--tx-primary)"}}>· {task.taskType}</span>}
                    </div>
                  )}
                  {task.description&&<p style={{fontSize:12.5,color:"var(--tx-tertiary)",marginBottom:5}}>{task.description}</p>}
                  {task.employee&&<p style={{fontSize:12,color:"var(--tx-tertiary)",marginBottom:4}}>👤 {task.employee.name} · {task.employee.position}</p>}
                  <p style={{fontSize:12,color:"var(--tx-tertiary)"}}>
                    {formatDate(task.startDate)} → <span style={{color:overdue?"var(--red)":"var(--tx-tertiary)"}}>{formatDate(task.endDate)}{overdue?" ⚠":""}</span>
                    {task.completedAt&&<span style={{color:"var(--green)",marginLeft:8}}>✓ {formatDate(task.completedAt)}</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
