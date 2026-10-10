"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Send } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type Application = { id:number; project_id:number; status:string; draft_text:string|null; created_at:string; submitted_at:string|null; replied_at:string|null; project:{title:string;url:string;source:string}|null };

export default function ApplicationsPage() {
  const [items,setItems] = useState<Application[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(API + "/applications",{credentials:"include"}).then(async r => {
      if (r.status===401) { window.location.assign("/login"); return []; }
      const d = await r.json(); if (!r.ok) throw new Error(d.detail ?? "Could not load applications"); return d;
    }).then(d => { if(active) setItems(d); }).catch(e => { if(active) setError(e instanceof Error ? e.message : "API connection failed"); }).finally(() => { if(active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <WorkspacePage title="Applications" subtitle="Track proposal drafts and confirmed submissions in one place.">
    {error && <div className="sub-alert error">{error}</div>}
    <section className="content-card"><h2>Proposal history</h2><p>Only submissions confirmed by a source adapter should be counted as sent.</p>
      {loading ? <div className="sub-empty">Loading application history…</div> : items.length===0 ? <div className="sub-empty"><FileText size={25}/><strong>No applications yet</strong><span>When you create a proposal draft for a project, it will be tracked here. Sent status is never inferred from a click alone.</span><Link href="/projects" className="sub-button">Browse projects</Link></div> :
      <div className="sub-list">{items.map(a=><article className="sub-list-row" key={a.id}><div className="sub-list-main"><strong>{a.project?.title ?? ("Project #" + a.project_id)}</strong><span>{(a.project?.source ?? "Unknown source") + " · Created " + new Date(a.created_at).toLocaleString()}</span>{a.draft_text && <span>{a.draft_text.slice(0,240) + (a.draft_text.length>240?"…":"")}</span>}{a.submitted_at && <span>Sent: {new Date(a.submitted_at).toLocaleString()}</span>}{a.replied_at && <span>Reply: {new Date(a.replied_at).toLocaleString()}</span>}</div><span className="sub-badge">{a.status}</span>{a.project?.url && <a className="sub-button" href={a.project.url} target="_blank" rel="noreferrer"><Send size={14}/>Open listing</a>}</article>)}</div>}
    </section>
  </WorkspacePage>;
}
