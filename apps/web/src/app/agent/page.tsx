"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, CheckCircle2, CircleAlert, Pause, Play, Settings2, Workflow } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type Profile = { skills: string[]; languages: string[]; payment_preferences: string[]; min_budget: number | null };
type Source = { is_enabled: boolean; source: string };
type AgentSettings = { enabled: boolean; telegram_linked: boolean; notify_new_projects?: boolean };
type Readiness = {
  worker_runtime: boolean;
  cron_configured: boolean;
  telegram_bot_configured: boolean;
  ai_provider_configured: boolean;
  marketplace_adapters: string[];
};

export default function AgentPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sources, setSources] = useState(0);
  const [agent, setAgent] = useState<AgentSettings | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

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

  async function scanNow() {
    setScanning(true); setError(""); setMessage("");
    try {
      const r = await fetch(API + "/agent/scan", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "Не удалось запустить сканирование");
      setMessage("Сканирование завершено: новых проектов " + Number(d.newProjects ?? 0) + ", источников " + Number(d.scannedSources ?? 0) + ".");
      if (Array.isArray(d.errors) && d.errors.length) setError(d.errors.join("; "));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось запустить сканирование");
    } finally { setScanning(false); }
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

  async function toggleNewProjectNotifications() {
    if (!agent) return;
    const previousValue = Boolean(agent.notify_new_projects);
    const nextValue = !previousValue;
    setAgent(current => current ? { ...current, notify_new_projects: nextValue } : current);
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch(API + "/agent/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notify_new_projects: nextValue })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "Не удалось изменить уведомления");
      setAgent(current => current ? { ...current, ...d } : current);
      setMessage(nextValue ? "Уведомления о новых проектах включены." : "Уведомления о новых проектах отключены.");
    } catch (e) {
      setAgent(current => current ? { ...current, notify_new_projects: previousValue } : current);
      setError(e instanceof Error ? e.message : "Не удалось изменить уведомления");
    } finally { setBusy(false); }
  }

  const checks = [
    { label: "Профиль навыков", ok: Boolean(profile && profile.skills.length > 0), detail: "Укажи навыки, чтобы оценка релевантности отражала твой реальный опыт." },
    { label: "Публичные Telegram-источники", ok: sources > 0, detail: "Включённые каналы можно сканировать вручную и по расписанию." },
    { label: "API Worker", ok: Boolean(readiness?.worker_runtime), detail: "Статус получен от текущего API Worker." },
    { label: "Cron Trigger", ok: Boolean(readiness?.cron_configured), detail: "Триггер настроен на каждые 15 минут. Реальное выполнение по расписанию нужно подтвердить после деплоя." },
    { label: "Telegram-бот", ok: Boolean(readiness?.telegram_bot_configured), detail: "Нужны TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET и BOT_API_SECRET в секретах Worker." },
    { label: "AI-провайдер", ok: Boolean(readiness?.ai_provider_configured), detail: "Нужны AI_API_KEY и AI_MODEL. После настройки проверим генерацию и оценку реальных заказов." },
    { label: "Биржи фриланса", ok: Boolean(readiness?.marketplace_adapters.length), detail: "Freelancehunt поддерживается через официальный API после подключения токена. Адаптеры Upwork, Kwork и FL.ru пока не готовы." }
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
        <input type="checkbox" checked={Boolean(agent?.notify_new_projects)} disabled={busy || !agent} onChange={() => void toggleNewProjectNotifications()} />
        <span><strong>Уведомлять о новых заказах в Telegram</strong><br/><span className="sub-muted">При отключении новые проекты всё равно сохраняются на сайте. Уведомления отправляются только для действительно новых записей.</span></span>
      </label>
      <button className="sub-button" style={{ marginTop: 8 }} disabled={scanning || sources === 0} onClick={() => void scanNow()}><Workflow size={15} />{scanning ? "Сканируем…" : "Сканировать источники"}</button>
    </section>
    <section className="content-card">
      <div className="panel-heading"><div><h2>Готовность системы</h2><p>Состояние конфигурации загружается из API, а не задаётся статическими значениями на странице.</p></div></div>
      <div className="sub-list" style={{ marginTop: 18 }}>{checks.map(check => <div className="sub-list-row" key={check.label}><div className="sub-list-main"><strong>{check.label}</strong><span>{check.detail}</span></div><span className={"sub-badge " + (check.ok ? "" : "pending")}>{check.ok ? <CheckCircle2 size={12} /> : <CircleAlert size={12} />} {check.ok ? "Готово" : "Не готово"}</span></div>)}</div>
    </section>
    <section className="content-card">
      <h2>Следующие шаги</h2>
      <p>Настрой источники и профиль, затем проверим полный путь от объявления до объяснимой оценки и черновика отклика.</p>
      <div className="sub-list">
        <div className="sub-list-row"><div className="sub-list-main"><strong>1. Профиль и фильтры</strong><span>Укажи навыки, языки, минимальный бюджет, способы выплат и исключаемые фразы.</span></div><Link className="sub-button" href="/settings"><Settings2 size={14} />Настройки</Link></div>
        <div className="sub-list-row"><div className="sub-list-main"><strong>2. Источники заказов</strong><span>Добавь публичные Telegram-каналы и запусти сканирование.</span></div><Link className="sub-button" href="/sources"><Workflow size={14} />Источники</Link></div>
      </div>
    </section>
    <section className="content-card"><h2>Безопасность откликов</h2><p>Сгенерированные отклики сохраняются как черновики. Отправка считается успешной только после подтверждения со стороны площадки. AI не должен выдумывать опыт, клиентов или результаты.</p></section>
  </WorkspacePage>;
}
