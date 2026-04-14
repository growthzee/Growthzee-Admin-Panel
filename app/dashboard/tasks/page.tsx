"use client";
import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import TaskCategoryBadge from "@/components/TaskCategoryBadge";

type Employee = { id:string;name:string;department:string;position:string };
type Task = { id:string;title:string;description?:string;category?:string|null;subCategory?:string|null;taskType?:string|null;status:string;priority:string;startDate:string;endDate:string;completedAt?:string;employee:Employee;_type?:"client";client?:{id:string;name:string;company?:string} };

const PRIS = ["LOW","MEDIUM","HIGH","URGENT"];
const INT_S = ["PENDING","IN_PROGRESS","COMPLETED","OVERDUE"];
const CLI_S = ["PENDING","IN_PROGRESS","COMPLETED","CHANGES_REQUIRED","OVERDUE"];
const S_BADGE: Record<string,string> = { PENDING:"badge-gray",IN_PROGRESS:"badge-blue",COMPLETED:"badge-green",CHANGES_REQUIRED:"badge-amber",OVERDUE:"badge-red" };
const S_LABEL: Record<string,string> = { PENDING:"Pending",IN_PROGRESS:"In progress",COMPLETED:"Done",CHANGES_REQUIRED:"Changes needed",OVERDUE:"Overdue" };
const P_COLOR: Record<string,string> = { LOW:"var(--tx-tertiary)",MEDIUM:"var(--tx-secondary)",HIGH:"var(--amber)",URGENT:"var(--red)" };

function TaskModal({ task, employees, onClose, onSave }: { task?:Task|null;employees:Employee[];onClose:()=>void;onSave:()=>void }) {
  const isClient = task?._type === "client";
  const [form, setForm] = useState({ title:task?.title||"",description:task?.description||"",priority:task?.priority||"MEDIUM",status:task?.status||"PENDING",startDate:task?.startDate?task.startDate.split("T")[0]:new Date().toISOString().split("T")[0],endDate:task?.endDate?task.endDate.split("T")[0]:"",employeeId:task?.employee?.id||employees[0]?.id||"" });
  const [loading,setLoading] = useState(false); const [error,setError] = useState("");
  const statuses = isClient ? CLI_S : INT_S;
  async function submit(e:React.FormEvent) {
    e.preventDefault();setError("");setLoading(true);
    try {
      const url = task?(isClient?`/api/client-tasks/${task.id}`:`/api/tasks/${task.id}`):`/api/tasks`;
      const res = await fetch(url,{method:task?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      const d = await res.json();
      if(!res.ok) throw new Error(d.error||"Failed");
      onSave();onClose();
    } catch(err:unknown){setError(err instanceof Error?err.message:"Error");}
    finally{setLoading(false);}
  }
  return (
    <div className="modal-backdrop anim-in">
      <div className="modal anim-scale">
        <div className="modal-header">
          <div>
            <p className="section-title">{task?"Edit task":"Create task"}</p>
            {isClient&&task?.client&&<p style={{fontSize:12,color:"var(--tx-tertiary)",marginTop:2}}>Client: {task.client.company||task.client.name}</p>}
          </div>
          <button className="btn-ghost btn-icon" onClick={onClose}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div className="modal-body">
          {error&&<div style={{padding:"8px 12px",background:"var(--red-bg)",borderRadius:"var(--r-md)",color:"var(--red)",fontSize:13,marginBottom:14}}>{error}</div>}
          <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:12}}>
            <div><label style={{display:"block",fontSize:12.5,fontWeight:500,color:"var(--tx-secondary)",marginBottom:5}}>Title *</label><input className="input" required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Task title…"/></div>
            <div><label style={{display:"block",fontSize:12.5,fontWeight:500,color:"var(--tx-secondary)",marginBottom:5}}>Description</label><textarea className="input" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} style={{minHeight:60}}/></div>
            {!isClient&&<div><label style={{display:"block",fontSize:12.5,fontWeight:500,color:"var(--tx-secondary)",marginBottom:5}}>Assigned to *</label><select className="input" required value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})}><option value="">Select employee…</option>{employees.map(e=><option key={e.id} value={e.id}>{e.name} — {e.department}</option>)}</select></div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={{display:"block",fontSize:12.5,fontWeight:500,color:"var(--tx-secondary)",marginBottom:5}}>Priority</label><select className="input" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{PRIS.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
              <div><label style={{display:"block",fontSize:12.5,fontWeight:500,color:"var(--tx-secondary)",marginBottom:5}}>Status</label><select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{statuses.map(s=><option key={s} value={s}>{s.replace(/_/g," ")}</option>)}</select></div>
              <div><label style={{display:"block",fontSize:12.5,fontWeight:500,color:"var(--tx-secondary)",marginBottom:5}}>Start date *</label><input className="input" type="date" required value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></div>
              <div><label style={{display:"block",fontSize:12.5,fontWeight:500,color:"var(--tx-secondary)",marginBottom:5}}>End date *</label><input className="input" type="date" required value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button type="button" className="btn btn-secondary" style={{flex:1}} onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{flex:1}} disabled={loading}>{loading&&<span className="spinner" style={{width:13,height:13,borderTopColor:"rgba(255,255,255,0.7)"}}/>}{loading?"Saving…":task?"Save changes":"Create task"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [intTasks,setIntTasks] = useState<Task[]>([]);
  const [cliTasks,setCliTasks] = useState<Task[]>([]);
  const [employees,setEmployees] = useState<Employee[]>([]);
  const [loading,setLoading] = useState(true);
  const [source,setSource] = useState<"all"|"internal"|"client">("all");
  const [sf,setSf] = useState("");
  const [modal,setModal] = useState<"add"|"edit"|null>(null);
  const [selected,setSelected] = useState<Task|null>(null);

  const fetchData = useCallback(async()=>{
    setLoading(true);
    const [ir,cr,er] = await Promise.all([fetch("/api/tasks"),fetch("/api/client-tasks"),fetch("/api/employees")]);
    const [id,cd,ed] = await Promise.all([ir.json(),cr.json(),er.json()]);
    setIntTasks(Array.isArray(id)?id:[]);
    setCliTasks((Array.isArray(cd)?cd:[]).filter((t:Task)=>t.employee).map((t:Task)=>({...t,_type:"client"as const})));
    setEmployees(Array.isArray(ed)?ed:[]);
    setLoading(false);
  },[]);
  useEffect(()=>{fetchData();},[fetchData]);

  const all = [...(source==="client"?[]:intTasks),...(source==="internal"?[]:cliTasks)];
  const visible = sf?all.filter(t=>t.status===sf):all;
  const counts = { all:all.length, PENDING:all.filter(t=>t.status==="PENDING").length, IN_PROGRESS:all.filter(t=>t.status==="IN_PROGRESS").length, COMPLETED:all.filter(t=>t.status==="COMPLETED").length, OVERDUE:all.filter(t=>t.status==="OVERDUE").length };

  async function markDone(task:Task){
    const url=task._type==="client"?`/api/client-tasks/${task.id}`:`/api/tasks/${task.id}`;
    await fetch(url,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"COMPLETED"})});
    fetchData();
  }
  async function del(task:Task){
    await fetch(task._type==="client"?`/api/client-tasks/${task.id}`:`/api/tasks/${task.id}`,{method:"DELETE"});
    fetchData();
  }

  return (
    <div className="page-section">
      <style>{`.tbl tbody tr:hover .row-actions{opacity:1!important}`}</style>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}} className="anim-up">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p style={{fontSize:13.5,color:"var(--tx-tertiary)",marginTop:5}}>{intTasks.length} internal · {cliTasks.length} client-assigned</p>
        </div>
        <button className="btn btn-primary" onClick={()=>{setSelected(null);setModal("add");}} disabled={employees.length===0}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create task
        </button>
      </div>

      {/* Source + status filter */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <div className="filter-tabs-wrap">
          {([["all","All",intTasks.length+cliTasks.length],["internal","Internal",intTasks.length],["client","Client",cliTasks.length]] as const).map(([k,l,c])=>(
            <button key={k} className={`filter-tab${source===k?" active":""}`} onClick={()=>{setSource(k);setSf("");}}>
              {l} <span className="count">{c}</span>
            </button>
          ))}
        </div>
        <div className="filter-tabs-wrap">
          {[["","All",counts.all],["PENDING","Pending",counts.PENDING],["IN_PROGRESS","Active",counts.IN_PROGRESS],["COMPLETED","Done",counts.COMPLETED],["OVERDUE","Overdue",counts.OVERDUE]].map(([k,l,c])=>(
            <button key={k as string} className={`filter-tab${sf===k?" active":""}`} onClick={()=>setSf(k as string)}>
              {l} <span className="count">{c}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        {loading?(
          <div className="empty"><div className="spinner"/></div>
        ):visible.length===0?(
          <div className="empty">
            <p style={{fontSize:18,marginBottom:6}}>✅</p>
            <p style={{fontWeight:600,color:"var(--tx-secondary)"}}>No tasks found</p>
            <p style={{fontSize:13}}>Create a task or change the filter</p>
          </div>
        ):(
          <table className="tbl">
            <thead>
              <tr><th>Task</th><th>Assigned to</th><th>Source</th><th>Priority</th><th>Status</th><th>Due</th><th></th></tr>
            </thead>
            <tbody>
              {visible.map(task=>{
                const overdue = new Date(task.endDate)<new Date()&&task.status!=="COMPLETED";
                return (
                  <tr key={`${task._type||"int"}-${task.id}`}>
                    <td style={{maxWidth:220}}>
                      {task.category && <div style={{marginBottom:4}}><TaskCategoryBadge category={task.category} subCategory={task.subCategory} taskType={task.taskType} compact/></div>}
                    <p style={{fontSize:13.5,fontWeight:500,color:task.status==="COMPLETED"?"var(--tx-tertiary)":"var(--tx-primary)",textDecoration:task.status==="COMPLETED"?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.title}</p>
                      {task.description&&<p style={{fontSize:12,color:"var(--tx-tertiary)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.description}</p>}
                    </td>
                    <td>
                      <Link href={`/dashboard/employees/${task.employee.id}`} style={{display:"flex",alignItems:"center",gap:8,textDecoration:"none"}}>
                        <div className="avatar" style={{width:24,height:24,fontSize:9}}>{task.employee.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}</div>
                        <span style={{fontSize:13,color:"var(--tx-primary)"}}>{task.employee.name}</span>
                      </Link>
                    </td>
                    <td>
                      {task._type==="client"&&task.client?(
                        <Link href={`/dashboard/clients/${task.client.id}`} className="badge badge-purple" style={{textDecoration:"none",fontSize:11.5}}>
                          🤝 {task.client.company||task.client.name}
                        </Link>
                      ):(
                        <span className="badge badge-gray" style={{fontSize:11.5}}>Internal</span>
                      )}
                    </td>
                    <td><span style={{fontSize:12.5,fontWeight:500,color:P_COLOR[task.priority]}}>{task.priority}</span></td>
                    <td><span className={`badge ${S_BADGE[task.status]||"badge-gray"}`}>{S_LABEL[task.status]||task.status}</span></td>
                    <td style={{fontSize:12.5,color:overdue?"var(--red)":"var(--tx-tertiary)",whiteSpace:"nowrap"}}>{formatDate(task.endDate)}{overdue?" ⚠":""}</td>
                    <td>
                      <div className="row-actions" style={{display:"flex",gap:2,justifyContent:"flex-end"}}>
                        {task.status!=="COMPLETED"&&<button className="btn-ghost btn-icon" title="Mark done" onClick={()=>markDone(task)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>}
                        <button className="btn-ghost btn-icon" title="Edit" onClick={()=>{setSelected(task);setModal("edit");}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button className="btn-ghost btn-icon" title="Delete" onClick={()=>del(task)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {(modal==="add"||modal==="edit")&&<TaskModal task={modal==="edit"?selected:null} employees={employees} onClose={()=>setModal(null)} onSave={fetchData}/>}
    </div>
  );
}
