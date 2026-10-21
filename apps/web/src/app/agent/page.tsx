"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Pause, Play, Settings2, Workflow } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type AgentSettings = { enabled: boolean; auto_draft?: boolean; auto_submit?: boolean; auto_reply?: boolean; daily_submission_limit?: number; telegram_linked: boolean; notify_application_updates?: boolean };
export default function AgentPage() {
  const [agent, setAgent] = useState<AgentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const rs = await Promise.all([
        fetch(API + "/agent/settings", { credentials: "include" })
      ]);
      if (rs.some(r => r.status === 401)) { window.location.assign("/login"); return; }
      const a = await rs[0].json();
      if (rs.some(response => !response.ok)) throw new Error("Не удалось загрузить состояние AI-агента");
      setAgent(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка соединения с API");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function toggle() {
    if (!agent) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch(API + "/agent/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: !agent.enabled })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "Не удалось изменить настройки агента");
      setAgent(d);
      if (d.enabled) {
        const scanResponse = await fetch(API + "/agent/scan", { method: "POST", credentials: "include" });
        const scanData = await scanResponse.json();
        if (!scanResponse.ok) {
          setMessage("Агент включён, но первый запуск сканирования не удался: " + (scanData.detail ?? "проверь источники и настройки"));
        } else if (!Number(scanData.totalSources ?? scanData.scannedSources ?? 0)) {
          setMessage("Агент включён, но источники не подключены. Добавь их на вкладке «Источники».");
        } else {
          setMessage("Агент включён. Первый пакет проверен: " + Number(scanData.scannedSources ?? 0) + " из " + Number(scanData.totalSources ?? scanData.scannedSources ?? 0) + " источников; новых проектов " + Number(scanData.newProjects ?? 0) + ", подготовлено откликов " + Number(scanData.draftedApplications ?? 0) + ". Полный обход продолжится по расписанию.");
          if (Array.isArray(scanData.errors) && scanData.errors.length) setError(scanData.errors.join("; "));
        }
      } else {
        setMessage("AI-агент приостановлен. Плановые сканирования остановлены.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось изменить состояние агента");
    } finally { setBusy(false); }
  }

  async function testAi() {
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch(API + "/agent/test-ai", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "AI-провайдер не ответил");
      setMessage("AI-провайдер подключён. Генерация откликов доступна.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось проверить AI-провайдера");
    } finally { setBusy(false); }
  }

  async function toggleAutoDraft() {
    if (!agent) return;
    const nextValue = !Boolean(agent.auto_draft);
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch(API + "/agent/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ auto_draft: nextValue })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "Не удалось изменить автоматическую подготовку откликов");
      setAgent(current => current ? { ...current, ...d } : current);
      setMessage(nextValue ? "Автоматическая подготовка откликов включена." : "Автоматическая подготовка откликов отключена.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось изменить автоматическую подготовку откликов");
    } finally { setBusy(false); }
  }

  async function toggleAutoSubmit() {
    if (!agent) return;
    const nextValue = !Boolean(agent.auto_submit ?? true);
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch(API + "/agent/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ auto_submit: nextValue })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "Не удалось изменить автоотправку");
      setAgent(current => current ? { ...current, ...d } : current);
      setMessage(nextValue ? "Автоотправка включена для поддерживаемых интеграций." : "Автоотправка отключена. Отклики будут сохраняться без отправки.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось изменить автоотправку");
    } finally { setBusy(false); }
  }

  async function toggleAutoReply() {
    if (!agent) return;
    const nextValue = !Boolean(agent.auto_reply);
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch(API + "/agent/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ auto_reply: nextValue })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "Не удалось изменить автоматические ответы");
      setAgent(current => current ? { ...current, ...d } : current);
      setMessage(nextValue ? "Автоматические ответы Freelancehunt включены." : "Автоматические ответы Freelancehunt отключены.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось изменить автоматические ответы");
    } finally { setBusy(false); }
  }

  async function changeDailyLimit(value: number) {
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch(API + "/agent/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ daily_submission_limit: value })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "Не удалось сохранить лимит");
      setAgent(current => current ? { ...current, ...d } : current);
      setMessage("Дневной лимит отправок сохранён.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить лимит");
    } finally { setBusy(false); }
  }

  async function toggleApplicationUpdateNotifications() {
    if (!agent) return;
    const previousValue = Boolean(agent.notify_application_updates ?? true);
    const nextValue = !previousValue;
    setAgent(current => current ? { ...current, notify_application_updates: nextValue } : current);
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch(API + "/agent/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notify_application_updates: nextValue })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "Не удалось изменить уведомления об ответах");
      setAgent(current => current ? { ...current, ...d } : current);
      setMessage(nextValue ? "Уведомления об ответах на отклики включены." : "Уведомления об ответах на отклики отключены.");
    } catch (e) {
      setAgent(current => current ? { ...current, notify_application_updates: previousValue } : current);
      setError(e instanceof Error ? e.message : "Не удалось изменить уведомления об ответах");
    } finally { setBusy(false); }
  }

  const statusLabel = agent ? agent.enabled ? "Включён" : "Приостановлен" : loading ? "Загрузка состояния…" : "Состояние недоступно";
  const toggleLabel = busy ? "Сохраняем…" : loading ? "Загружаем состояние…" : agent ? agent.enabled ? "Приостановить агента" : "Включить агента" : "Агент недоступен";

  return <WorkspacePage title="AI-агент" subtitle="Управляй поиском заказов, подготовкой и отправкой откликов.">
    {error && <div className="sub-alert error">{error}</div>}
    {message && <div className="sub-alert">{message}</div>}
    <section className="content-card">
      <div className="panel-heading"><div><h2><Bot size={17} style={{ verticalAlign: "middle", marginRight: 8 }} />Управление агентом</h2><p>Состояние управляет плановым сканированием включённых источников пользователя.</p></div><span aria-live="polite" className={"sub-badge " + (agent?.enabled ? "" : "pending")}>{statusLabel}</span></div>
      <button className={"sub-button " + (agent?.enabled ? "danger" : "primary")} style={{ marginTop: 16 }} disabled={busy || loading || !agent} onClick={() => void toggle()}>
        {agent?.enabled ? <Pause size={15} /> : <Play size={15} />}{toggleLabel}
      </button>
      {!agent && !loading && <button className="sub-button" style={{ marginTop: 8 }} onClick={() => void load()}>Повторить загрузку</button>}
      <p style={{ marginTop: 12 }}>После запуска агент проверяет подключённые источники и продолжает искать подходящие заказы по расписанию.</p>
      <button className="sub-button" style={{ marginTop: 8 }} disabled={busy || !agent} onClick={() => void testAi()}>Проверить AI</button>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16 }}>
        <input type="checkbox" checked={agent ? Boolean(agent.auto_draft) : false} disabled={busy || loading || !agent} onChange={() => void toggleAutoDraft()} />
        <span><strong>Автоматически готовить отклики</strong><br/><span className="sub-muted">AI пишет персональные сообщения для свежих подходящих заказов. Там, где подключённый адаптер поддерживает отправку, агент может отправить их сам.</span></span>
      </label>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 12 }}>
        <input type="checkbox" checked={agent ? Boolean(agent.auto_submit ?? true) : false} disabled={busy || loading || !agent} onChange={() => void toggleAutoSubmit()} />
        <span><strong>Автоматически отправлять отклики</strong><br/><span className="sub-muted">Без подтверждения каждой заявки. Сейчас отправка реализуется через официальный API Freelancehunt; для Telegram-публикаций и неподключённых бирж доступна только подготовка текста.</span></span>
      </label>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 12 }}>
        <input type="checkbox" checked={agent ? Boolean(agent.auto_reply) : false} disabled={busy || loading || !agent || !agent.enabled} onChange={() => void toggleAutoReply()} />
        <span><strong>Отвечать на новые сообщения Freelancehunt</strong><br/><span className="sub-muted">AI ответит в переписке по подтверждённой заявке после нового сообщения заказчика. Старые переписки при первом подключении не затрагиваются. Для Telegram-каналов и остальных площадок отправка сообщений недоступна.</span></span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
        <span><strong>Лимит отправок в сутки</strong><br/><span className="sub-muted">Для подключённых бирж с поддержкой отправки. За один проход агент обрабатывает до 10 заказов; если очередь больше, продолжит при следующей проверке через 15 минут.</span></span>
        <select value={agent ? agent.daily_submission_limit ?? 10 : ""} disabled={busy || loading || !agent} onChange={e => void changeDailyLimit(Number(e.target.value))} style={{ marginLeft: "auto", minWidth: 90 }}>
          {!agent && <option value="">{loading ? "Загрузка…" : "Недоступно"}</option>}
          <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={30}>30</option><option value={50}>50</option>
        </select>
      </label>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 12 }}>
        <input type="checkbox" checked={agent ? Boolean(agent.notify_application_updates ?? true) : false} disabled={busy || loading || !agent} onChange={() => void toggleApplicationUpdateNotifications()} />
        <span><strong>Уведомлять об ответах на отклики в Telegram</strong><br/><span className="sub-muted">После ручной синхронизации Freelancehunt бот сообщит о подтверждённом отклонении отклика или выборе исполнителя.</span></span>
      </label>
    </section>
    <section className="content-card">
      <h2>Настройка поиска</h2>
      <p>Для поиска заказов заполни профиль и включи нужные источники. Остальные технические проверки выполняются системой.</p>
      <div className="sub-list">
        <div className="sub-list-row"><div className="sub-list-main"><strong>1. Профиль и фильтры</strong><span>Укажи навыки, языки, минимальный бюджет, способы выплат и исключаемые фразы.</span></div><Link className="sub-button" href="/settings"><Settings2 size={14} />Настройки</Link></div>
        <div className="sub-list-row"><div className="sub-list-main"><strong>2. Источники заказов</strong><span>Выбери источники заказов. Агент будет проверять их автоматически.</span></div><Link className="sub-button" href="/sources"><Workflow size={14} />Источники</Link></div>
      </div>
    </section>
    <section className="content-card"><h2>Безопасность откликов</h2><p>Агент отправляет подходящие отклики без подтверждения каждой заявки, соблюдает дневной лимит и сохраняет результат. Статус «Отправлен» выставляется только после подтверждения со стороны биржи. Если бюджет, валюта или доступ к API не подходят для отправки, сообщение останется в «Откликах». AI не выдумывает опыт, клиентов или результаты.</p></section>
  </WorkspacePage>;
}

