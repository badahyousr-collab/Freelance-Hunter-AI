"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type Project = { id:number; source:string; url:string; title:string; description:string; language:string|null; budget_min:number|null; budget_max:number|null; currency:string|null; payment_method:string|null; discovered_at:string; match_score:number|null; match_reasons:string[] };

function budget(p: Project) {
  if (p.budget_min == null && p.budget_max == null) return "Не указан";
  const n = (v:number) => new Intl.NumberFormat(undefined,{maximumFractionDigits:0}).format(v);
  const cur = p.currency ? " " + p.currency : "";
  if (p.budget_min != null && p.budget_max != null && p.budget_min !== p.budget_max) return n(p.budget_min) + "–" + n(p.budget_max) + cur;
  return n(p.budget_max ?? p.budget_min ?? 0) + cur;
}

function sourceName(source: string) {
  return ({ telegram: "Telegram", freelancehunt: "Freelancehunt", fl_ru: "FL.ru", freelance_ru: "Freelance.ru" } as Record<string, string>)[source] ?? source;
}

export default function ProjectsPage() {
  const [items,setItems] = useState<Project[]>([]);
  const [q,setQ] = useState("");
  const [source,setSource] = useState("");
  const [includeUnmatched,setIncludeUnmatched] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [draftingId,setDraftingId] = useState<number|null>(null);
  async function load(search = "", sourceFilter = "", includeAll = false) {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({limit:"100"});
      if (search.trim()) params.set("q",search.trim());
      if (sourceFilter) params.set("source",sourceFilter);
      if (includeAll) params.set("matched_only","false");
      const res = await fetch(API + "/projects?" + params.toString(),{credentials:"include"});
      if (res.status === 401) { window.location.assign("/login"); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Не удалось загрузить заказы.");
      setItems(data);
  } catch (e) { setError(e instanceof Error ? e.message : "Не удалось подключиться к сервису."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function submit(e:FormEvent) { e.preventDefault(); void load(q,source,includeUnmatched); }
  async function draft(project:Project) { setDraftingId(project.id); setError(""); setMessage(""); try { const r=await fetch(API+"/applications/"+project.id+"/draft",{method:"POST",credentials:"include"}); const d=await r.json(); if(!r.ok) throw new Error(d.detail??"Could not generate proposal draft"); window.location.assign("/applications"); } catch(e) { setError(e instanceof Error?e.message:"Could not generate draft"); } finally { setDraftingId(null); } }
  return <WorkspacePage title="Проекты" subtitle="Актуальные заказы, подходящие под твой профиль.">
    <section className="content-card"><form className="sub-form" onSubmit={submit}><div className="sub-form-grid">
      <div className="sub-form-field"><label htmlFor="project-query">Поиск заказов</label><input id="project-query" className="sub-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Python, Telegram-боты, интеграция API…" /></div>
      <div className="sub-form-field"><label htmlFor="project-source">Источник</label><select id="project-source" className="sub-select" value={source} onChange={e=>setSource(e.target.value)}><option value="">Все источники</option><option value="telegram">Telegram</option><option value="freelancehunt">Freelancehunt</option><option value="fl_ru">FL.ru</option><option value="freelance_ru">Freelance.ru</option></select></div>
    </div><label className="sub-filter-checkbox"><input type="checkbox" checked={includeUnmatched} onChange={e=>setIncludeUnmatched(e.target.checked)} />Показывать также слабые и неоценённые совпадения</label><button className="sub-button primary" type="submit"><SlidersHorizontal size={15}/>Применить</button></form></section>
    {error && <div className="sub-alert error">{error}</div>}{message && <div className="sub-alert">{message}</div>}
    <section className="content-card"><h2>Найденные заказы</h2><p>{loading ? "Загружаем заказы…" : `Показано: ${items.length}`}</p>
      {!loading && items.length===0 ? <div className="sub-empty"><Search size={25}/><strong>Подходящих заказов пока нет</strong><span>Добавь Telegram-канал или включи поиск по FL.ru, Freelance.ru или Freelancehunt. Агент показывает публикации не старше 72 часов.</span><Link className="sub-button" href="/sources">Подключить источники</Link></div> :
      <div className="sub-table-wrap"><table className="sub-table"><thead><tr><th>ЗАКАЗ</th><th>ИСТОЧНИК</th><th>БЮДЖЕТ</th><th>СОВПАДЕНИЕ</th><th>НАЙДЕН</th><th>ДЕЙСТВИЕ</th></tr></thead><tbody>{items.map(p=><tr key={p.id}><td><strong>{p.title}</strong><div className="sub-muted">{String(p.description ?? "").slice(0,140) || "Описание не указано"}</div><a className="text-link" href={p.url} target="_blank" rel="noreferrer">Открыть заказ <ArrowUpRight size={13}/></a></td><td>{sourceName(p.source)}</td><td>{budget(p)}<div className="sub-muted">{p.payment_method??"Способ оплаты не указан"}</div></td><td>{p.match_score==null?"Не оценён":p.match_score+"%"}</td><td>{new Date(p.discovered_at).toLocaleDateString("ru-RU")}</td><td><button className="sub-button" disabled={draftingId!==null} onClick={()=>void draft(p)}>{draftingId===p.id?"Готовим…":"Подготовить отклик"}</button></td></tr>)}</tbody></table></div>}
    </section>
  </WorkspacePage>;
}

