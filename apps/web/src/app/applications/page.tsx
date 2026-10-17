"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, FileText, Save, Send, X } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type Application = { id:number; project_id:number; status:string; draft_text:string|null; created_at:string; submitted_at:string|null; replied_at:string|null; project:{title:string;url:string;source:string}|null };

function statusLabel(status: string) {
  const labels: Record<string,string> = {
    draft: "Черновик",
    awaiting_confirmation: "Готов к подтверждению",
    submitting: "Отправляется",
    sent: "Отправлен площадкой",
    failed: "Ошибка отправки",
    replied: "Есть ответ",
    closed: "Закрыт"
  };
  return labels[status] ?? status;
}

export default function ApplicationsPage() {
  const [items,setItems] = useState<Application[]>([]);
  const [draftTexts,setDraftTexts] = useState<Record<number,string>>({});
  const [loading,setLoading] = useState(true);
  const [savingId,setSavingId] = useState<number|null>(null);
  const [actionId,setActionId] = useState<number|null>(null);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(API + "/applications",{credentials:"include"});
      if (response.status===401) { window.location.assign("/login"); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Не удалось загрузить отклики");
      setItems(data);
      setDraftTexts(Object.fromEntries((data as Application[]).map((item) => [item.id,item.draft_text ?? ""])));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка соединения с API");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function update(item: Application, payload: {draft_text?:string;status?:string}, success: string, setter: (value:number|null)=>void) {
    setter(item.id); setError(""); setMessage("");
    try {
      const response = await fetch(API + "/applications/" + item.id, {
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        credentials:"include",
        body:JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Не удалось обновить отклик");
      setItems(current => current.map(entry => entry.id === item.id ? {...entry,...data} : entry));
      if (typeof data.draft_text === "string") setDraftTexts(current => ({...current,[item.id]:data.draft_text}));
      setMessage(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось обновить отклик");
    } finally { setter(null); }
  }

  return <WorkspacePage title="Отклики" subtitle="Редактируй черновики и готовь их к ручной проверке. Отправка через биржу пока не подключена.">
    {error && <div className="sub-alert error" role="alert">{error}</div>}
    {message && <div className="sub-alert" role="status">{message}</div>}
    <section className="content-card">
      <h2>История откликов</h2>
      <p>Статус «Отправлен» устанавливается только после подтверждения поддерживаемой биржей. Сейчас доступны редактирование, подготовка к подтверждению и закрытие черновика.</p>
      {loading ? <div className="sub-empty">Загружаем историю откликов…</div> : items.length===0 ? <div className="sub-empty"><FileText size={25}/><strong>Откликов пока нет</strong><span>Создай черновик на странице проектов, чтобы он появился здесь.</span><Link href="/projects" className="sub-button">Перейти к проектам</Link></div> :
      <div className="sub-list">{items.map(item => {
        const editable = ["draft","awaiting_confirmation"].includes(item.status);
        return <article className="sub-list-row" key={item.id}>
          <div className="sub-list-main">
            <strong>{item.project?.title ?? ("Проект #" + item.project_id)}</strong>
            <span>{(item.project?.source ?? "Источник неизвестен") + " · Создан " + new Date(item.created_at).toLocaleString()}</span>
            <span className="sub-badge">{statusLabel(item.status)}</span>
            {editable && <>
              <label htmlFor={"proposal-" + item.id}>Текст отклика</label>
              <textarea id={"proposal-" + item.id} className="sub-input" rows={7} maxLength={5000} value={draftTexts[item.id] ?? ""} onChange={event => setDraftTexts(current => ({...current,[item.id]:event.target.value}))} />
              <span>{(draftTexts[item.id] ?? "").length}/5000 символов</span>
              <div className="sub-actions">
                <button className="sub-button" type="button" disabled={savingId===item.id || actionId===item.id} onClick={() => void update(item,{draft_text:draftTexts[item.id] ?? ""},"Черновик сохранён.",setSavingId)}><Save size={14}/>{savingId===item.id ? "Сохраняем…" : "Сохранить текст"}</button>
                {item.status === "draft" ? <button className="sub-button primary" type="button" disabled={savingId===item.id || actionId===item.id} onClick={() => void update(item,{draft_text:draftTexts[item.id] ?? "",status:"awaiting_confirmation"},"Черновик подготовлен к подтверждению. Отправка не выполнялась.",setActionId)}><Check size={14}/>Подготовить к подтверждению</button> : <button className="sub-button" type="button" disabled={savingId===item.id || actionId===item.id} onClick={() => void update(item,{status:"draft"},"Отклик возвращён в черновики.",setActionId)}>Вернуть в черновик</button>}
                <button className="sub-button danger" type="button" disabled={savingId===item.id || actionId===item.id} onClick={() => void update(item,{status:"closed"},"Черновик закрыт.",setActionId)}><X size={14}/>Закрыть</button>
              </div>
            </>}
            {item.submitted_at && <span>Подтверждено как отправленное: {new Date(item.submitted_at).toLocaleString()}</span>}
            {item.replied_at && <span>Ответ клиента: {new Date(item.replied_at).toLocaleString()}</span>}
          </div>
          {item.project?.url && <a className="sub-button" href={item.project.url} target="_blank" rel="noreferrer"><Send size={14}/>Открыть заказ</a>}
        </article>;
      })}</div>}
    </section>
  </WorkspacePage>;
}
