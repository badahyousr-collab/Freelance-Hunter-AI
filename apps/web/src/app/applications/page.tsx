"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, FileText, Save, Send, X } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type Application = { id:number; project_id:number; status:string; draft_text:string|null; created_at:string; submitted_at:string|null; replied_at:string|null; provider_submission_id?:string|null; provider_status?:string|null; provider_thread_id?:string|null; submission_error?:string|null; project:{title:string;url:string;source:string;budget_max:number|null;currency:string|null}|null };
type SubmissionInput = { budget_amount:string; currency:string; days:string; safe_type:string };
type ApplicationMessage = { id:string; sender_type:string; message:string; posted_at:string|null };

function statusLabel(status: string) {
  const labels: Record<string,string> = {
    draft: "Черновик",
    awaiting_confirmation: "Готов к подтверждению",
    submitting: "Отправляется",
    sent: "Отправлен площадкой",
    failed: "Ошибка отправки",
    submission_unknown: "Нужно проверить на бирже",
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
  const [submissionInputs,setSubmissionInputs] = useState<Record<number,SubmissionInput>>({});
  const [messagesByApplication,setMessagesByApplication] = useState<Record<number,ApplicationMessage[]>>({});
  const [loadingMessagesId,setLoadingMessagesId] = useState<number|null>(null);

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
      setSubmissionInputs(Object.fromEntries((data as Application[]).map((item) => [item.id, {
        budget_amount: item.project?.budget_max ? String(item.project.budget_max) : "",
        currency: ["UAH","RUB"].includes(String(item.project?.currency ?? "").toUpperCase()) ? String(item.project?.currency).toUpperCase() : "RUB",
        days: "3",
        safe_type: "employer"
      }])));
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

  async function loadApplicationMessages(item: Application) {
    setLoadingMessagesId(item.id); setError("");
    try {
      const response = await fetch(API + "/applications/" + item.id + "/messages", { credentials: "include" });
      if (response.status === 401) { window.location.assign("/login"); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Не удалось загрузить переписку");
      setMessagesByApplication(current => ({ ...current, [item.id]: data as ApplicationMessage[] }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить переписку");
    } finally { setLoadingMessagesId(null); }
  }

  async function submitFreelancehunt(item: Application) {
    if (!window.confirm("Отправить этот отклик через Freelancehunt? Будет создана реальная заявка на площадке.")) return;
    const input = submissionInputs[item.id];
    if (!input) return;
    setActionId(item.id); setError(""); setMessage("");
    try {
      const response = await fetch(API + "/applications/" + item.id + "/submit", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        credentials:"include",
        body:JSON.stringify({
          budget_amount: Number(input.budget_amount),
          currency: input.currency,
          days: Number(input.days),
          safe_type: input.safe_type === "null" ? null : input.safe_type
        })
      });
      const data = await response.json();
      if (data.application) setItems(current => current.map(entry => entry.id === item.id ? {...entry,...data.application} : entry));
      if (!response.ok) throw new Error(data.detail ?? "Freelancehunt не подтвердил отправку.");
      setItems(current => current.map(entry => entry.id === item.id ? {...entry,...data} : entry));
      setMessage("Freelancehunt подтвердил отправку отклика.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отправить отклик.");
    } finally { setActionId(null); }
  }

  return <WorkspacePage title="Отклики" subtitle="Редактируй черновики. Подтверждённая отправка доступна через официальный Freelancehunt API после подключения токена.">
    {error && <div className="sub-alert error" role="alert">{error}</div>}
    {message && <div className="sub-alert" role="status">{message}</div>}
    <section className="content-card">
      <h2>История откликов</h2>
      <p>Статус «Отправлен» устанавливается только после успешного ответа биржи. Перед реальной отправкой сайт покажет подтверждение и потребует бюджет, срок и тип оплаты.</p>
      {loading ? <div className="sub-empty">Загружаем историю откликов…</div> : items.length===0 ? <div className="sub-empty"><FileText size={25}/><strong>Откликов пока нет</strong><span>Создай черновик на странице проектов, чтобы он появился здесь.</span><Link href="/projects" className="sub-button">Перейти к проектам</Link></div> :
      <div className="sub-list">{items.map(item => {
        const editable = ["draft","awaiting_confirmation","failed"].includes(item.status);
        return <article className="sub-list-row" key={item.id}>
          <div className="sub-list-main">
            <strong>{item.project?.title ?? ("Проект #" + item.project_id)}</strong>
            <span>{(item.project?.source ?? "Источник неизвестен") + " · Создан " + new Date(item.created_at).toLocaleString()}</span>
            <span className="sub-badge">{statusLabel(item.status)}</span>
            {item.submission_error && <span className="sub-alert error" role="status">{item.submission_error}</span>}
            {item.status === "submission_unknown" && <span>Не отправляй повторно, пока вручную не проверишь статус заявки на Freelancehunt.</span>}
            {editable && <>
              <label htmlFor={"proposal-" + item.id}>Текст отклика</label>
              <textarea id={"proposal-" + item.id} className="sub-input" rows={7} maxLength={5000} value={draftTexts[item.id] ?? ""} onChange={event => setDraftTexts(current => ({...current,[item.id]:event.target.value}))} />
              <span>{(draftTexts[item.id] ?? "").length}/5000 символов</span>
              {item.status === "awaiting_confirmation" && item.project?.source === "freelancehunt" && (
                <div className="sub-form" style={{ marginTop: 12, maxWidth: 560 }}>
                  <label htmlFor={"bid-amount-" + item.id}>Сумма отклика (UAH или RUB)</label>
                  <input id={"bid-amount-" + item.id} className="sub-input" type="number" min="1" step="0.01" value={submissionInputs[item.id]?.budget_amount ?? ""} onChange={event => setSubmissionInputs(current => ({...current,[item.id]:{...(current[item.id] ?? {budget_amount:"",currency:"RUB",days:"3",safe_type:"employer"}),budget_amount:event.target.value}}))} />
                  <label htmlFor={"bid-currency-" + item.id}>Валюта</label>
                  <select id={"bid-currency-" + item.id} className="sub-input" value={submissionInputs[item.id]?.currency ?? "RUB"} onChange={event => setSubmissionInputs(current => ({...current,[item.id]:{...(current[item.id] ?? {budget_amount:"",currency:"RUB",days:"3",safe_type:"employer"}),currency:event.target.value}}))}><option value="RUB">RUB</option><option value="UAH">UAH</option></select>
                  <label htmlFor={"bid-days-" + item.id}>Срок выполнения, дней</label>
                  <input id={"bid-days-" + item.id} className="sub-input" type="number" min="1" max="365" step="1" value={submissionInputs[item.id]?.days ?? "3"} onChange={event => setSubmissionInputs(current => ({...current,[item.id]:{...(current[item.id] ?? {budget_amount:"",currency:"RUB",days:"3",safe_type:"employer"}),days:event.target.value}}))} />
                  <label htmlFor={"bid-safe-" + item.id}>Тип оплаты</label>
                  <select id={"bid-safe-" + item.id} className="sub-input" value={submissionInputs[item.id]?.safe_type ?? "employer"} onChange={event => setSubmissionInputs(current => ({...current,[item.id]:{...(current[item.id] ?? {budget_amount:"",currency:"RUB",days:"3",safe_type:"employer"}),safe_type:event.target.value}}))}><option value="employer">Безопасная сделка, комиссия работодателя</option><option value="developer">Безопасная сделка, комиссия исполнителя</option><option value="split">Комиссия пополам</option><option value="null">Прямая оплата</option><option value="employer_cashless">Безопасная сделка для юрлиц</option></select>
                  <button className="sub-button primary" type="button" disabled={actionId===item.id || savingId===item.id || !submissionInputs[item.id]?.budget_amount} onClick={() => void submitFreelancehunt(item)}><Send size={14}/>{actionId===item.id ? "Отправляем…" : "Подтвердить и отправить через Freelancehunt"}</button>
                </div>
              )}
              <div className="sub-actions">
                <button className="sub-button" type="button" disabled={savingId===item.id || actionId===item.id} onClick={() => void update(item,{draft_text:draftTexts[item.id] ?? ""},"Черновик сохранён.",setSavingId)}><Save size={14}/>{savingId===item.id ? "Сохраняем…" : "Сохранить текст"}</button>
                {item.status === "draft" ? <button className="sub-button primary" type="button" disabled={savingId===item.id || actionId===item.id} onClick={() => void update(item,{draft_text:draftTexts[item.id] ?? "",status:"awaiting_confirmation"},"Черновик подготовлен к подтверждению. Отправка не выполнялась.",setActionId)}><Check size={14}/>Подготовить к подтверждению</button> : <button className="sub-button" type="button" disabled={savingId===item.id || actionId===item.id} onClick={() => void update(item,{status:"draft"},"Отклик возвращён в черновики.",setActionId)}>Вернуть в черновик</button>}
                <button className="sub-button danger" type="button" disabled={savingId===item.id || actionId===item.id} onClick={() => void update(item,{status:"closed"},"Черновик закрыт.",setActionId)}><X size={14}/>Закрыть</button>
              </div>
            </>}
            {item.submitted_at && <span>Подтверждено как отправленное: {new Date(item.submitted_at).toLocaleString()}</span>}
            {item.provider_submission_id && <span>ID отклика Freelancehunt: {item.provider_submission_id}</span>}
            {item.replied_at && <span>Ответ клиента: {new Date(item.replied_at).toLocaleString()}</span>}
            {item.provider_thread_id && (
              <div style={{ marginTop: 10 }}>
                <button className="sub-button" type="button" disabled={loadingMessagesId===item.id} onClick={() => void loadApplicationMessages(item)}>
                  {loadingMessagesId===item.id ? "Загружаем переписку…" : messagesByApplication[item.id] ? "Обновить переписку" : "Показать переписку"}
                </button>
                {messagesByApplication[item.id] && (
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {messagesByApplication[item.id].length === 0 ? <p className="sub-muted">Сообщений пока нет.</p> : messagesByApplication[item.id].map(message => (
                      <article key={message.id} className="sub-card" style={{ padding: 12 }}>
                        <div className="sub-muted" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <span>{message.sender_type === "client" ? "Заказчик" : message.sender_type === "freelancer" ? "Вы" : "Участник переписки"}</span>
                          {message.posted_at && <time>{new Date(message.posted_at).toLocaleString()}</time>}
                        </div>
                        <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.message}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {item.project?.url && <a className="sub-button" href={item.project.url} target="_blank" rel="noreferrer"><Send size={14}/>Открыть заказ</a>}
        </article>;
      })}</div>}
    </section>
  </WorkspacePage>;
}
