"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

type CT = { id:string;status:string };
type Client = { id:string;name:string;email:string;phone?:string;company?:string;website?:string;notes?:string;status:string;createdAt:string;portalEnabled:boolean;clientTasks:CT[] };
const CLI_S = ["ACTIVE","INACTIVE","PROSPECT"];
const S_BADGE: Record<string,string> = { ACTIVE:"badge-green",INACTIVE:"badge-red",PROSPECT:"badge-amber" };
const S_LABEL: Record<string,string> = { ACTIVE:"Active",INACTIVE:"Inactive",PROSPECT:"Prospect" };

function Modal({ client, onClose, onSave }: { client?:Client|null;onClose:()=>void;onSave:()=>void }) {
  const [f,setF] = useState({name:client?.name||"",email:client?.email||"",phone:client?.phone||"",company:client?.company||"",website:client?.website||"",notes:client?.notes||"",status:client?.status||"ACTIVE"});
  const [loading,setLoading] = useState(false); const [error,setError] = useState("");
  async function submit(e:React.FormEvent){
    e.preventDefault();setError("");setLoading(true);
    try{const res=await fetch(client?`/api/clients/${client.id}`:"/api/clients",{method:client?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});const d=await res.json();if(!res.ok)throw new Error(d.error||"Failed");onSave();onClose();}
    catch(err:unknown){setError(err instanceof Error?err.message:"Error");}
    finally{setLoading(false);}
  }
  return (
    <div className="modal-backdrop anim-in">
      <div className="modal anim-scale">
        <div className="modal-header">
          <p className="section-title">{client?"Edit client":"Add client"}</p>
          <button className="btn-ghost btn-icon" onClick={onClose}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div className="modal-body" style={{maxHeight:"75vh",overflowY:"auto"}}>
          {error&&<div style={{padding:"8px 12px",background:"var(--red-bg)",borderRadius:"var(--r-md)",color:"var(--red)",fontSize:13,marginBottom:14}}>{error}</div>}
          <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:12}}>
            {[{k:"name",l:"Name",req:true},{k:"email",l:"Email",req:true,type:"email"},{k:"phone",l:"Phone"},{k:"company",l:"Company"},{k:"website",l:"Website"}].map(({k,l,req,type})=>(
              <div key={k}><label style={{display:"block",fontSize:12.5,fontWeight:500,color:"var(--tx-secondary)",marginBottom:5}}>{l}{req?" *":""}</label><input className="input" required={req} type={type||"text"} value={f[k as keyof typeof f]} onChange={e=>setF({...f,[k]:e.target.value})} placeholder={l}/></div>
            ))}
            <div><label style={{display:"block",fontSize:12.5,fontWeight:500,color:"var(--tx-secondary)",marginBottom:5}}>Status</label><select className="input" value={f.status} onChange={e=>setF({...f,status:e.target.value})}>{CLI_S.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div><label style={{display:"block",fontSize:12.5,fontWeight:500,color:"var(--tx-secondary)",marginBottom:5}}>Notes</label><textarea className="input" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})} rows={2} style={{minHeight:60}}/></div>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button type="button" className="btn btn-secondary" style={{flex:1}} onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{flex:1}} disabled={loading}>{loading&&<span className="spinner" style={{width:13,height:13,borderTopColor:"rgba(255,255,255,0.7)"}}/>}{loading?"Saving…":client?"Save":"Add client"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [clients,setClients] = useState<Client[]>([]);
  const [loading,setLoading] = useState(true);
  const [search,setSearch] = useState("");
  const [modal,setModal] = useState<"add"|"edit"|null>(null);
  const [selected,setSelected] = useState<Client|null>(null);

  const fetchClients = useCallback(async()=>{
    setLoading(true);
    const p=new URLSearchParams();if(search)p.set("search",search);
    const res=await fetch(`/api/clients?${p}`);const d=await res.json();
    setClients(Array.isArray(d)?d:[]);setLoading(false);
  },[search]);
  useEffect(()=>{const t=setTimeout(fetchClients,300);return()=>clearTimeout(t);},[fetchClients]);
  async function deleteClient(id:string){await fetch(`/api/clients/${id}`,{method:"DELETE"});fetchClients();}

  return (
    <div className="page-section">
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}} className="anim-up">
        <div><h1 className="page-title">Clients</h1><p style={{fontSize:13.5,color:"var(--tx-tertiary)",marginTop:5}}>{clients.length} clients total</p></div>
        <button className="btn btn-primary" onClick={()=>{setSelected(null);setModal("add");}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add client
        </button>
      </div>

      <div className="search-wrap" style={{maxWidth:280,marginBottom:16}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients…"/>
      </div>

      {loading?(
        <div className="empty"><div className="spinner"/></div>
      ):clients.length===0?(
        <div className="empty card" style={{padding:80}}>
          <p style={{fontSize:24,marginBottom:8}}>🤝</p>
          <p style={{fontWeight:600,color:"var(--tx-secondary)"}}>No clients yet</p>
          <p style={{fontSize:13}}>Add your first client to get started</p>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12}}>
          {clients.map(c=>{
            const done=c.clientTasks.filter(t=>t.status==="COMPLETED").length;
            const total=c.clientTasks.length;
            const rate=total>0?Math.round((done/total)*100):0;
            const changes=c.clientTasks.filter(t=>t.status==="CHANGES_REQUIRED").length;
            return (
              <div key={c.id} className="card card-hover" style={{padding:18}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
                    <div className="avatar avatar-md">{c.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}</div>
                    <div style={{minWidth:0}}>
                      <p style={{fontSize:14,fontWeight:600,color:"var(--tx-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</p>
                      {c.company&&<p style={{fontSize:12,color:"var(--tx-tertiary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.company}</p>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:4,flexShrink:0,marginLeft:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    <span className={`badge ${S_BADGE[c.status]||"badge-gray"}`}>{S_LABEL[c.status]||c.status}</span>
                    {c.portalEnabled&&<span className="badge badge-blue" style={{fontSize:10.5}}>Portal</span>}
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:12}}>
                  {[["Done",done,"var(--green)"],["Pending",c.clientTasks.filter(t=>t.status==="PENDING").length,"var(--tx-tertiary)"],["Changes",changes,"var(--amber)"]].map(([l,v,col])=>(
                    <div key={l as string} style={{background:"var(--hover-bg)",borderRadius:"var(--r-sm)",padding:"8px",textAlign:"center"}}>
                      <p style={{fontSize:18,fontWeight:700,color:col as string,letterSpacing:"-0.02em"}}>{v}</p>
                      <p style={{fontSize:10.5,color:"var(--tx-tertiary)",marginTop:2}}>{l}</p>
                    </div>
                  ))}
                </div>

                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <p style={{fontSize:12,color:"var(--tx-tertiary)"}}>{total} tasks total</p>
                    <p style={{fontSize:12,fontWeight:500,color:"var(--accent)"}}>{rate}%</p>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{width:`${rate}%`}}/></div>
                </div>

                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid var(--border)"}}>
                  <p style={{fontSize:12,color:"var(--tx-tertiary)"}}>{formatDate(c.createdAt)}</p>
                  <div style={{display:"flex",gap:2}}>
                    <Link href={`/dashboard/clients/${c.id}`} className="btn-ghost btn-icon" title="View">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </Link>
                    <button className="btn-ghost btn-icon" onClick={()=>{setSelected(c);setModal("edit");}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="btn-ghost btn-icon" onClick={()=>deleteClient(c.id)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {(modal==="add"||modal==="edit")&&<Modal client={modal==="edit"?selected:null} onClose={()=>setModal(null)} onSave={fetchClients}/>}
    </div>
  );
}
