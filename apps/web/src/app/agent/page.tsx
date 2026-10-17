"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, CheckCircle2, CircleAlert, Pause, Play, Settings2, Workflow } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type Profile = { skills: string[]; languages: string[]; payment_preferences: string[]; min_budget: number | null };
type Source = { is_enabled: boolean; source: string };
type AgentSettings = { enabled: boolean; auto_draft?: boolean; auto_submit?: boolean; daily_submission_limit?: number; telegram_linked: boolean; notify_application_updates?: boolean };
type Readiness = {
  worker_runtime: boolean;
  cron_configured: boolean;
  telegram_bot_configured: boolean;
  ai_provider_configured: boolean;
  marketplace_adapters: string[];
  freelancehunt_connected?: boolean;
};

export default function AgentPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sources, setSources] = useState(0);
  const [agent, setAgent] = useState<AgentSettings | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [testingAI, setTestingAI] = useState(false);

  async function load() {
    setError("");
    try {
      const rs = await Promise.all([
        fetch(API + "/profile", { credentials: "include" }),
        fetch(API + "/sources", { credentials: "include" }),
        fetch(API + "/agent/settings", { credentials: "include" }),
        fetch(API + "/agent/readiness", { credentials: "include" })
      ]);
      if (rs.some(r => r.status === 401)) { window.location.assign("/login"); return; }
      const p = await rs[0].json();
      const s = await rs[1].json();
      const a = await rs[2].json();
      const r = await rs[3].json();
      if (rs.some(response => !response.ok)) throw new Error("Не удалось загрузить состояние AI-агента");
      setProfile(p);
      setSources(s.filter((item: Source) => item.is_enabled && item.source === "telegram").length);
      setAgent(a);
      setReadiness(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка соединения с API");
    }
  }

  useEffect(() => { void load(); }, []);

  async function testAIProvider() {
    setTestingAI(true); setError(""); setMessage("");
    try {
      const r = await fetch(API + "/agent/test-ai", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.detail ?? "Проверка AI-провайдера не прошла");
      setMessage("AI-провайдер отвечает. Модель: " + d.model);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось проверить AI-провайдера");
    } finally { setTestingAI(false); }
  }

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
      setMessage(d.enabled
        ? "AI-агент включён. Плановое сканирование зависит от активного Cron Trigger."
        : "AI-агент приостановлен. Плановые сканирования остановлены.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось изменить состояние агента");
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

  const checks = [
    { label: "Профиль навыков", ok: Boolean(profile && profile.skills.length > 0), detail: "Укажи навыки, чтобы оценка релевантности отражала твой реальный опыт.", href: "/settings", action: "Настроить" },
    { label: "Публичные Telegram-источники", ok: sources > 0, detail: "Включённые каналы проверяются автоматически по расписанию, когда агент активен.", href: "/sources", action: "Источники" },
    { label: "API Worker", ok: Boolean(readiness?.worker_runtime), detail: "Статус получен от текущего API Worker." },
    { label: "Cron Trigger", ok: Boolean(readiness?.cron_configured), detail: "Триггер настроен на каждые 15 минут. Реальное выполнение по расписанию нужно подтвердить после деплоя." },
    { label: "Telegram-бот", ok: Boolean(readiness?.telegram_bot_configured), detail: "Нужны TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET и BOT_API_SECRET в секретах Worker.", href: "/integrations", action: "Интеграции" },
    { label: "AI-провайдер", ok: Boolean(readiness?.ai_provider_configured), detail: "Нужны AI_API_KEY, AI_MODEL и AI_API_BASE_URL. Проверь подключение кнопкой ниже." },
    { label: "Биржи фриланса", ok: Boolean(readiness?.freelancehunt_connected), detail: "Нужны токен Freelancehunt и секрет INTEGRATION_ENCRYPTION_KEY. Upwork, Kwork и FL.ru пока не поддерживают отправку в этой версии.", href: "/integrations", action: "Подключить" }
  ];

  return <WorkspacePage title="AI-агент" subtitle="Настрой отбор заказов и проверь готовность сервисов перед автоматическим поиском.">
    {error && <div className="sub-alert error">{error}</div>}
    {message && <div className="sub-alert">{message}</div>}
    <section className="content-card">
      <div className="panel-heading"><div><h2><Bot size={17} style={{ verticalAlign: "middle", marginRight: 8 }} />Управление агентом</h2><p>Состояние управляет плановым сканированием включённых источников пользователя.</p></div><span className={"sub-badge " + (agent?.enabled ? "" : "pending")}>{agent?.enabled ? "Включён" : "Приостановлен"}</span></div>
      <button className={"sub-button " + (agent?.enabled ? "danger" : "primary")} style={{ marginTop: 16 }} disabled={busy || !agent} onClick={() => void toggle()}>
        {agent?.enabled ? <Pause size={15} /> : <Play size={15} />}{busy ? "Сохраняем…" : agent?.enabled ? "Приостановить агента" : "Включить агента"}
      </button>
      <p style={{ marginTop: 12 }}>Включение не заменяет проверку деплоя, секретов и реального выполнения Cron Trigger.</p>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16 }}>
        <input type="checkbox" checked={Boolean(agent?.auto_draft)} disabled={busy || !agent} onChange={() => void toggleAutoDraft()} />
        <span><strong>Автоматически готовить отклики</strong><br/><span className="sub-muted">AI пишет персональные сообщения для свежих подходящих заказов. Там, где подключённый адаптер поддерживает отправку, агент может отправить их сам.</span></span>
      </label>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 12 }}>
        <input type="checkbox" checked={Boolean(agent?.auto_submit ?? true)} disabled={busy || !agent} onChange={() => void toggleAutoSubmit()} />
        <span><strong>Автоматически отправлять отклики</strong><br/><span className="sub-muted">Без подтверждения каждой заявки. Сейчас отправка реализуется через официальный API Freelancehunt; для Telegram-публикаций и неподключённых бирж доступна только подготовка текста.</span></span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
        <span><strong>Лимит отправок в сутки</strong><br/><span className="sub-muted">Для подключённых бирж с поддержкой отправки.</span></span>
        <select value={agent?.daily_submission_limit ?? 10} disabled={busy || !agent} onChange={e => void changeDailyLimit(Number(e.target.value))} style={{ marginLeft: "auto", minWidth: 90 }}>
          <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={30}>30</option><option value={50}>50</option>
        </select>
      </label>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 12 }}>
        <input type="checkbox" checked={Boolean(agent?.notify_application_updates ?? true)} disabled={busy || !agent} onChange={() => void toggleApplicationUpdateNotifications()} />
        <span><strong>Уведомлять об ответах на отклики в Telegram</strong><br/><span className="sub-muted">После ручной синхронизации Freelancehunt бот сообщит о подтверждённом отклонении отклика или выборе исполнителя.</span></span>
      </label>
    </section>
    <section className="content-card">
      <div className="panel-heading"><div><h2>Готовность системы</h2><p>Состояние конфигурации загружается из API, а не задаётся статическими значениями на странице.</p></div></div>
      <div className="sub-list" style={{ marginTop: 18 }}>{checks.map(check => <div className="sub-list-row" key={check.label}><div className="sub-list-main"><strong>{check.label}</strong><span>{check.detail}</span></div>{check.href && <Link className="sub-button" href={check.href}>{check.action ?? "Открыть"}</Link>}<span className={"sub-badge " + (check.ok ? "" : "pending")}>{check.ok ? <CheckCircle2 size={12} /> : <CircleAlert size={12} />} {check.ok ? "Готово" : "Не готово"}</span></div>)}</div>
      <button className="sub-button" style={{ marginTop: 14 }} disabled={testingAI} onClick={() => void testAIProvider()}>{testingAI ? "Проверяем AI…" : "Проверить подключение AI"}</button>
    </section>
    <section className="content-card">
      <h2>Следующие шаги</h2>
      <p>Настрой источники и профиль, затем агент будет искать заказы, отбирать подходящие, писать персональные сообщения и отправлять их там, где площадка и подключённый API это позволяют.</p>
      <div className="sub-list">
        <div className="sub-list-row"><div className="sub-list-main"><strong>1. Профиль и фильтры</strong><span>Укажи навыки, языки, минимальный бюджет, способы выплат и исключаемые фразы.</span></div><Link className="sub-button" href="/settings"><Settings2 size={14} />Настройки</Link></div>
        <div className="sub-list-row"><div className="sub-list-main"><strong>2. Источники заказов</strong><span>Добавь публичные Telegram-каналы. Агент проверит их по расписанию.</span></div><Link className="sub-button" href="/sources"><Workflow size={14} />Источники</Link></div>
      </div>
    </section>
    <section className="content-card"><h2>Безопасность откликов</h2><p>Агент отправляет подходящие отклики без подтверждения каждой заявки, соблюдает дневной лимит и сохраняет результат. Статус «Отправлен» выставляется только после подтверждения со стороны биржи. Если бюджет, валюта или доступ к API не подходят для отправки, сообщение останется в «Откликах». AI не выдумывает опыт, клиентов или результаты.</p></section>
  </WorkspacePage>;
}
