"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, FileText, Save, Send, X } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type Application = { id:number; project_id:number; status:string; draft_text:string|null; created_at:string; submitted_at:string|null; replied_at:string|null; provider_submission_id?:string|null; submission_error?:string|null; project:{title:string;url:string;source:string;currency?:string|null;budget_min?:number|null}|null };
type BidInput = { days:string; budget_amount:string; currency:string; safe_type:string };

function statusLabel(status: string) {
  const labels: Record<string,string> = {
    draft: "Черновик",
    awaiting_confirmation: "Готов к подтверждению",
    submitting: "Отправляется",
    submission_unknown: "Нужно проверить на площадке",
    failed: "Биржа отклонила отклик",
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
  const [bidValues,setBidValues] = useState<Record<number,BidInput>>({});

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

  function bidValue(item: Application): BidInput {
    return bidValues[item.id] ?? {
      days: "1",
      budget_amount: item.project?.budget_min ? String(item.project.budget_min) : "",
      currency: item.project?.currency === "UAH" ? "UAH" : "RUB",
      safe_type: ""
    };
  }

  function changeBidValue(item: Application, key: keyof BidInput, value: string) {
    setBidValues(current => ({ ...current, [item.id]: { ...bidValue(item), [key]: value } }));
  }

  async function submitFreelancehunt(item: Application) {
    const values = bidValue(item);
    setActionId(item.id); setError(""); setMessage("");
    try {
      const response = await fetch(API + "/applications/" + item.id + "/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          days: Number(values.days),
          budget_amount: Number(values.budget_amount),
          currency: values.currency,
          safe_type: values.safe_type
        })
      });
      const data = await response.json();
      if (data.application) setItems(current => current.map(entry => entry.id === item.id ? { ...entry, ...data.application } : entry));
      if (!response.ok) throw new Error(data.detail ?? "Freelancehunt не подтвердил отправку.");
      setItems(current => current.map(entry => entry.id === item.id ? { ...entry, ...data } : entry));
      setMessage("Freelancehunt подтвердил отправку отклика." + (data.provider_submission_id ? " ID отклика: " + data.provider_submission_id + "." : ""));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отправить отклик.");
    } finally {
      setActionId(null);
    }
  }

  return <WorkspacePage title="Отклики" subtitle="Редактируй черновики, подтверждай отклики и отправляй их через проверенную интеграцию Freelancehunt.">
    {error && <div className="sub-alert error" role="alert">{error}</div>}
    {message && <div className="sub-alert" role="status">{message}</div>}
    <section className="content-card">
      <h2>История откликов</h2>
      <p>Отправка Freelancehunt доступна только после подключения API, подготовки текста и отдельного нажатия кнопки отправки. При неопределённом ответе повторная отправка блокируется, чтобы не создать дубликат.</p>
      {loading ? <div className="sub-empty">Загружаем историю откликов…</div> : items.length===0 ? <div className="sub-empty"><FileText size={25}/><strong>Откликов пока нет</strong><span>Создай черновик на странице проектов, чтобы он появился здесь.</span><Link href="/projects" className="sub-button">Перейти к проектам</Link></div> :
      <div className="sub-list">{items.map(item => {
        const editable = ["draft","awaiting_confirmation","failed"].includes(item.status);
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
            {item.submission_error && <span role="status">Статус отправки: {item.submission_error}</span>}
            {item.provider_submission_id && <span>ID отклика Freelancehunt: {item.provider_submission_id}</span>}
            {item.status === "awaiting_confirmation" && item.project?.source === "freelancehunt" && (
              <div className="sub-form">
                <strong>Параметры отклика Freelancehunt</strong>
                <div className="sub-form-grid">
                  <div className="sub-form-field"><label htmlFor={"bid-days-" + item.id}>Срок, дней</label><input id={"bid-days-" + item.id} className="sub-input" type="number" min="1" max="365" value={bidValue(item).days} onChange={event => changeBidValue(item, "days", event.target.value)} /></div>
                  <div className="sub-form-field"><label htmlFor={"bid-amount-" + item.id}>Бюджет отклика</label><input id={"bid-amount-" + item.id} className="sub-input" type="number" min="1" step="0.01" value={bidValue(item).budget_amount} onChange={event => changeBidValue(item, "budget_amount", event.target.value)} placeholder="Сумма" /></div>
                  <div className="sub-form-field"><label htmlFor={"bid-currency-" + item.id}>Валюта</label><select id={"bid-currency-" + item.id} className="sub-select" value={bidValue(item).currency} onChange={event => changeBidValue(item, "currency", event.target.value)}><option value="RUB">RUB</option><option value="UAH">UAH</option></select></div>
                  <div className="sub-form-field"><label htmlFor={"bid-safe-" + item.id}>Тип оплаты</label><select id={"bid-safe-" + item.id} className="sub-select" value={bidValue(item).safe_type} onChange={event => changeBidValue(item, "safe_type", event.target.value)}><option value="">Прямая оплата</option><option value="employer">Безопасная сделка за счёт заказчика</option><option value="developer">Безопасная сделка за счёт исполнителя</option><option value="split">Комиссия пополам</option><option value="employer_cashless">Безналичная безопасная сделка</option></select></div>
                </div>
                <button className="sub-button primary" type="button" disabled={actionId===item.id || savingId===item.id || !String(draftTexts[item.id] ?? "").trim()} onClick={() => void submitFreelancehunt(item)}><Send size={14}/>{actionId===item.id ? "Отправляем…" : "Отправить через Freelancehunt"}</button>
              </div>
            )}
            {item.submitted_at && <span>Подтверждено как отправленное: {new Date(item.submitted_at).toLocaleString()}</span>}
            {item.replied_at && <span>Ответ клиента: {new Date(item.replied_at).toLocaleString()}</span>}
          </div>
          {item.project?.url && <a className="sub-button" href={item.project.url} target="_blank" rel="noreferrer"><Send size={14}/>Открыть заказ</a>}
        </article>;
      })}</div>}
    </section>
  </WorkspacePage>;
}
