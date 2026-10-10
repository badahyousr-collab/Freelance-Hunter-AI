"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type Project = { id:number; source:string; url:string; title:string; description:string; language:string|null; budget_min:number|null; budget_max:number|null; currency:string|null; payment_method:string|null; discovered_at:string; match_score:number|null; match_reasons:string[] };

function budget(p: Project) {
  if (p.budget_min == null && p.budget_max == null) return "Not specified";
  const n = (v:number) => new Intl.NumberFormat(undefined,{maximumFractionDigits:0}).format(v);
  const cur = p.currency ? " " + p.currency : "";
  if (p.budget_min != null && p.budget_max != null && p.budget_min !== p.budget_max) return n(p.budget_min) + "–" + n(p.budget_max) + cur;
  return n(p.budget_max ?? p.budget_min ?? 0) + cur;
}

export default function ProjectsPage() {
  const [items,setItems] = useState<Project[]>([]);
  const [q,setQ] = useState("");
  const [source,setSource] = useState("");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [draftingId,setDraftingId] = useState<number|null>(null);
  async function load(search = "", sourceFilter = "") {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({limit:"100"});
      if (search.trim()) params.set("q",search.trim());
      if (sourceFilter) params.set("source",sourceFilter);
      const res = await fetch(API + "/projects?" + params.toString(),{credentials:"include"});
      if (res.status === 401) { window.location.assign("/login"); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Could not load projects");
      setItems(data);
    } catch (e) { setError(e instanceof Error ? e.message : "API connection failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function submit(e:FormEvent) { e.preventDefault(); void load(q,source); }
  async function draft(project:Project) { setDraftingId(project.id); setError(""); setMessage(""); try { const r=await fetch(API+"/applications/"+project.id+"/draft",{method:"POST",credentials:"include"}); const d=await r.json(); if(!r.ok) throw new Error(d.detail??"Could not generate proposal draft"); window.location.assign("/applications"); } catch(e) { setError(e instanceof Error?e.message:"Could not generate draft"); } finally { setDraftingId(null); } }
  return <WorkspacePage title="Projects" subtitle="Discover and review opportunities collected from your configured sources.">
    <section className="content-card"><form className="sub-form" onSubmit={submit}><div className="sub-form-grid">
      <div className="sub-form-field"><label htmlFor="project-query">Search projects</label><input id="project-query" className="sub-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Python, Telegram bot, API integration…" /></div>
      <div className="sub-form-field"><label htmlFor="project-source">Source</label><select id="project-source" className="sub-select" value={source} onChange={e=>setSource(e.target.value)}><option value="">All sources</option><option value="telegram">Telegram</option><option value="kwork">Kwork</option><option value="fl_ru">FL.ru</option><option value="freelancer">Freelancer.com</option><option value="upwork">Upwork</option></select></div>
    </div><button className="sub-button primary" type="submit"><SlidersHorizontal size={15}/>Apply filters</button></form></section>
    {error && <div className="sub-alert error">{error}</div>}{message && <div className="sub-alert">{message}</div>}
    <section className="content-card"><h2>Collected opportunities</h2><p>{loading ? "Loading saved project data…" : items.length + " project" + (items.length===1?"":"s") + " returned from the database."}</p>
      {!loading && items.length===0 ? <div className="sub-empty"><Search size={25}/><strong>No projects found yet</strong><span>Once a source adapter has collected listings, they will appear here. Configuring a source does not itself mean its integration is already active.</span><Link className="sub-button" href="/sources">Configure sources</Link></div> :
      <div className="sub-table-wrap"><table className="sub-table"><thead><tr><th>PROJECT</th><th>SOURCE</th><th>BUDGET</th><th>MATCH</th><th>DISCOVERED</th><th>ACTION</th></tr></thead><tbody>{items.map(p=><tr key={p.id}><td><strong>{p.title}</strong><div className="sub-muted">{p.description.slice(0,140)}</div><a className="text-link" href={p.url} target="_blank" rel="noreferrer">Open listing <ArrowUpRight size={13}/></a></td><td>{p.source}</td><td>{budget(p)}<div className="sub-muted">{p.payment_method??"Payment unknown"}</div></td><td>{p.match_score==null?"Not scored":p.match_score+"%"}</td><td>{new Date(p.discovered_at).toLocaleDateString()}</td><td><button className="sub-button" disabled={draftingId!==null} onClick={()=>void draft(p)}>{draftingId===p.id?"Drafting…":"AI draft"}</button></td></tr>)}</tbody></table></div>}
    </section>
  </WorkspacePage>;
}
