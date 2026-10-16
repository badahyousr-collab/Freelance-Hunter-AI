"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, Workflow } from "lucide-react";
import Link from "next/link";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type Catalog = {source:string;label:string;kind:string;capabilities:string[];setup_note:string};
type Source = {id:number;source:string;identifier:string;is_enabled:boolean;status:string;created_at:string;last_scan_at:string|null;last_error:string|null;last_discovered_count:number};

export default function SourcesPage() {
  const [catalog,setCatalog] = useState<Catalog[]>([]);
  const [items,setItems] = useState<Source[]>([]);
  const [source,setSource] = useState("telegram");
  const [identifier,setIdentifier] = useState("");
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try {
      const pair = await Promise.all([fetch(API+"/sources/catalog",{credentials:"include"}),fetch(API+"/sources",{credentials:"include"})]);
      if (pair.some(r=>r.status===401)) { window.location.assign("/login"); return; }
      const cd=await pair[0].json(); const sd=await pair[1].json();
      if(!pair[0].ok||!pair[1].ok) throw new Error(cd.detail??sd.detail??"Could not load sources");
      setCatalog(cd); setItems(sd);
    } catch(e) { setError(e instanceof Error?e.message:"API connection failed"); }
    finally { setLoading(false); }
  }
  useEffect(()=>{void load();},[]);
  async function add(e:FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const body:Record<string,unknown>={source,is_enabled:true}; if(identifier.trim()) body.identifier=identifier.trim();
      const r=await fetch(API+"/sources",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(body)});
      const d=await r.json(); if(!r.ok) throw new Error(d.detail??"Could not configure source");
      setMessage("Added "+d.source+(d.identifier?" · "+d.identifier:"")+". "+(d.status==="pending_integration"?"The marketplace adapter still needs implementation.":"Channel configuration saved; a server Telegram session is still required."));
      setIdentifier(""); await load();
    } catch(e) {setError(e instanceof Error?e.message:"Could not add source");} finally {setBusy(false);}
  }
  async function toggle(item:Source) {
    setError("");
    try {const r=await fetch(API+"/sources/"+item.id,{method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({is_enabled:!item.is_enabled})});const d=await r.json();if(!r.ok)throw new Error(d.detail??"Could not update source");setItems(old=>old.map(x=>x.id===item.id?d:x));}
    catch(e){setError(e instanceof Error?e.message:"Could not update source");}
  }
  async function remove(item:Source) {
    setError("");
    try {const r=await fetch(API+"/sources/"+item.id,{method:"DELETE",credentials:"include"});if(!r.ok){const d=await r.json();throw new Error(d.detail??"Could not delete source");}setItems(old=>old.filter(x=>x.id!==item.id));setMessage("Source removed.");}
    catch(e){setError(e instanceof Error?e.message:"Could not remove source");}
  }
  const selected=catalog.find(c=>c.source===source);
  return <WorkspacePage title="Sources" subtitle="Choose discovery sources and configure public Telegram channels.">
    {error&&<div className="sub-alert error">{error}</div>}{message&&<div className="sub-alert">{message}</div>}
    <section className="content-card"><div className="panel-heading"><div><h2>Marketplace accounts</h2><p>Manage API credentials separately from discovery sources. A saved credential is not treated as a working connector until verified.</p></div><Link className="sub-button" href="/integrations">Manage credentials ↗</Link></div></section>
    <section className="content-card"><h2>Add a source</h2><p>Source setup saves your preferences. A marketplace is not shown as operational until its adapter is implemented and verified.</p><form className="sub-form" onSubmit={add}><div className="sub-form-grid">
      <div className="sub-form-field"><label htmlFor="source-kind">Source type</label><select id="source-kind" className="sub-select" value={source} onChange={e=>setSource(e.target.value)}>{catalog.map(c=><option key={c.source} value={c.source}>{c.label}</option>)}</select></div>
      <div className="sub-form-field"><label htmlFor="source-id">{source==="telegram"?"Public channel username":"Optional identifier"}</label><input id="source-id" className="sub-input" value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={source==="telegram"?"@python_jobs":"Leave blank for default"} required={source==="telegram"}/></div>
    </div>{selected&&<div className="sub-muted">{selected.setup_note}</div>}<button className="sub-button primary" disabled={busy} type="submit"><Plus size={15}/>{busy?"Saving…":"Add source"}</button></form></section>
    <section className="content-card"><div className="panel-heading"><div><h2>Your configured sources</h2><p>Enable or pause individual source configurations.</p></div><button className="sub-button" onClick={()=>void load()}><RefreshCw size={14}/>Refresh</button></div>
      {loading?<div className="sub-empty">Loading source settings…</div>:items.length===0?<div className="sub-empty"><Workflow size={25}/><strong>No sources configured</strong><span>Add a public Telegram channel or select a marketplace to start setting up discovery.</span></div>:<div className="sub-list">{items.map(item=><article className="sub-list-row" key={item.id}><div className="sub-list-main"><strong>{(catalog.find(c=>c.source===item.source)?.label??item.source)+(item.source==="telegram"?" · @"+item.identifier:"")}</strong><span>{(item.source==="telegram"?"Public channel discovery":"Marketplace source")+" · "+item.status.replaceAll("_"," ")}</span><span>{(item.last_scan_at ? "Last scan: " + new Date(item.last_scan_at).toLocaleString() : "No scan recorded") + " · " + item.last_discovered_count + " listings" + (item.last_error ? " · Last error: " + item.last_error : "")}</span></div><span className={"sub-badge "+(item.status==="pending_integration"?"pending":"")}>{item.is_enabled?"Enabled":"Paused"}</span><div className="sub-actions"><button className="sub-button" onClick={()=>void toggle(item)}>{item.is_enabled?"Pause":"Enable"}</button><button className="sub-button danger" aria-label="Remove source" onClick={()=>void remove(item)}><Trash2 size={14}/></button></div></article>)}</div>}
    </section>
    <section className="content-card"><h2>Connector availability</h2><p>Configured sources are user preferences; the live ingestion worker is being implemented separately.</p><div className="sub-list">{catalog.map(c=><div className="sub-list-row" key={c.source}><div className="sub-list-main"><strong>{c.label}</strong><span>{c.setup_note}</span></div><span className={"sub-badge "+(c.source==="telegram"?"":"pending")}>{c.source==="telegram"?"Parser available":"Adapter pending"}</span></div>)}</div></section>
  </WorkspacePage>;
}
