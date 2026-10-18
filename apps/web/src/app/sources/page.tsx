"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, Workflow, ExternalLink, Radio, ChevronDown } from "lucide-react";
import Link from "next/link";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type Catalog = { source: string; label: string; kind: string; capabilities: string[]; setup_note: string };
type Source = { id: number; source: string; identifier: string; is_enabled: boolean; status: string; created_at: string; last_scan_at: string | null; last_error: string | null; last_discovered_count: number };
type RecommendedChannel = { handle: string; label: string; focus: string; language: string };

const recommendedChannels: RecommendedChannel[] = [
  { handle: "job_for_bots", label: "Вакансии для разработчиков ботов", focus: "Заказы на Telegram-ботов и Mini Apps, часто с ТЗ и бюджетом", language: "RU" },
  { handle: "zerocode_jobs", label: "Запили мне, зерокодер", focus: "Заказы на no-code, автоматизацию, приложения и ботов", language: "RU" },
  { handle: "freelancetaverna", label: "Фриланс Таверна Official", focus: "Заказы и удалённые вакансии, включая разработку и digital", language: "RU" },
  { handle: "GetClient", label: "GetClient | Фриланс вакансии", focus: "Заказы по IT, дизайну, маркетингу и другим направлениям", language: "RU" },
  { handle: "kadrof_work", label: "Вакансии для фрилансеров", focus: "Новые удалённые вакансии и заказы для фрилансеров", language: "RU" },
  { handle: "frwork3", label: "Фриланс, удалённая работа", focus: "Свежие заказы и вакансии по digital и другим направлениям", language: "RU" },
  { handle: "digitaltender", label: "DIGITAL Tender / freelance", focus: "Заказы по разработке, дизайну, маркетингу и digital", language: "RU" },
  { handle: "FreelancehuntProjects", label: "Проєкти Freelancehunt", focus: "Фриланс-проекты, включая разработку и цифровые услуги", language: "UA/RU" },
  { handle: "itfreelancers", label: "IT freelance and remote", focus: "IT-проекты, лиды и сотрудничество", language: "EN/RU" },
  { handle: "hr_itwork", label: "IT вакансии / Работа программиста", focus: "Вакансии для программистов и фрилансеров", language: "RU" }
];

export default function SourcesPage() {
  const [catalog, setCatalog] = useState<Catalog[]>([]);
  const [items, setItems] = useState<Source[]>([]);
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [addingChannel, setAddingChannel] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const pair = await Promise.all([
        fetch(API + "/sources/catalog", { credentials: "include" }),
        fetch(API + "/sources", { credentials: "include" })
      ]);
      if (pair.some(r => r.status === 401)) { window.location.assign("/login"); return; }
      const cd = await pair[0].json(); const sd = await pair[1].json();
      if (!pair[0].ok || !pair[1].ok) throw new Error(cd.detail ?? sd.detail ?? "Не удалось загрузить источники");
      setCatalog(cd); setItems(sd);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка соединения с API");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function saveSource(channel: string) {
    const r = await fetch(API + "/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ source: "telegram", identifier: channel, is_enabled: true })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.detail ?? "Не удалось добавить источник");
    return d as Source;
  }

  async function add(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      await saveSource(identifier.trim());
      setMessage("Источник добавлен. Агент проверит его автоматически при следующем запуске по расписанию, если он включён.");
      setIdentifier(""); await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить источник");
    } finally { setBusy(false); }
  }

  async function addRecommended(channel: RecommendedChannel) {
    setAddingChannel(channel.handle); setError(""); setMessage("");
    try {
      await saveSource("@" + channel.handle);
      setMessage("Канал @" + channel.handle + " добавлен. Агент проверит его автоматически при следующем запуске по расписанию, если он включён.");
      await load();
    } catch (e) {
      const text = e instanceof Error ? e.message : "Не удалось добавить канал";
      if (/already configured|already exists|уже настроен|уже добавлен/i.test(text)) {
        setMessage("Канал @" + channel.handle + " уже есть в твоих источниках.");
      } else setError(text);
    } finally { setAddingChannel(""); }
  }

  async function toggle(item: Source) {
    setError("");
    try {
      const r = await fetch(API + "/sources/" + item.id, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ is_enabled: !item.is_enabled })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "Не удалось обновить источник");
      setItems(old => old.map(x => x.id === item.id ? d : x));
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось обновить источник"); }
  }

  async function remove(item: Source) {
    setError("");
    try {
      const r = await fetch(API + "/sources/" + item.id, { method: "DELETE", credentials: "include" });
      if (!r.ok) { const d = await r.json(); throw new Error(d.detail ?? "Не удалось удалить источник"); }
      setItems(old => old.filter(x => x.id !== item.id));
      setMessage("Источник удалён.");
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось удалить источник"); }
  }

  const selected = catalog.find(c => c.source === "telegram");
  const configuredHandles = new Set(items.filter(item => item.source === "telegram").map(item => item.identifier.replace(/^@/, "").toLowerCase()));

  return <WorkspacePage title="Источники" subtitle="Собирай заказы из публичных Telegram-каналов и официального Freelancehunt API.">
    {error && <div className="sub-alert error" role="alert">{error}</div>}
    {message && <div className="sub-alert" role="status">{message}</div>}

    <section className="content-card">
      <div className="panel-heading"><div><h2>Подборка Telegram-каналов</h2><p>Каналы с заказами и проектами. Агент проверяет новые публикации автоматически каждые 15 минут, если включён.</p></div><Radio size={18}/></div>
      <div className="sub-list">
        {recommendedChannels.map(channel => {
          const configured = configuredHandles.has(channel.handle.toLowerCase());
          return <article className="sub-list-row" key={channel.handle}>
            <div className="sub-list-main">
              <strong>{channel.label}</strong>
              <span>@{channel.handle} · {channel.language}</span>
              <span>{channel.focus}</span>
            </div>
            <div className="sub-actions">
              <a className="sub-button" href={"https://t.me/" + channel.handle} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Открыть</a>
              <button className="sub-button primary" disabled={configured || Boolean(addingChannel)} onClick={() => void addRecommended(channel)}>
                <Plus size={14}/>{addingChannel === channel.handle ? "Добавляем…" : configured ? "Добавлен" : "Добавить"}
              </button>
            </div>
          </article>;
        })}
      </div>
      <p className="sub-muted">Каналы отобраны по публичным страницам и описаниям, доступным на момент проверки. Часть публикаций может быть обычными вакансиями, рекламой или неподходящими заказами. Такие результаты нужно отсеивать фильтрами и проверять после каждого сканирования.</p>
    </section>

    <section className="content-card">
      <div className="panel-heading"><div><h2>Подключить Telegram-канал</h2><p>Добавь публичный канал с заказами, чтобы AI-агент отслеживал новые публикации.</p></div><Link className="sub-button" href="/integrations">Подключить Freelancehunt ↗</Link></div>
      <form className="sub-form" onSubmit={add}>
        <div className="sub-form-grid">
          <div className="sub-form-field"><label htmlFor="source-id">Имя публичного канала</label><input id="source-id" className="sub-input" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="@python_jobs" required /></div>
        </div>
        {selected && <div className="sub-muted">{selected.setup_note}</div>}
        <button className="sub-button primary" disabled={busy} type="submit"><Plus size={15}/>{busy ? "Сохраняем…" : "Добавить источник"}</button>
      </form>
    </section>

    <section className="content-card">
      <div className="panel-heading"><div><h2>Подключённые источники</h2><p>Источники свёрнуты, чтобы список оставался компактным. Нажми на строку, чтобы посмотреть статус и детали.</p></div><div className="sub-actions"><button className="sub-button" onClick={() => void load()} disabled={loading}><RefreshCw size={14}/>Обновить</button></div></div>
      {loading ? <div className="sub-empty">Загружаем источники…</div> : items.length === 0 ? <div className="sub-empty"><Workflow size={25}/><strong>Источники пока не добавлены</strong><span>Добавь канал из подборки выше или укажи публичный Telegram-канал вручную.</span></div> :
        <div className="sub-list source-accordion-list">{items.map(item => <details className="source-accordion" key={item.id}>
          <summary className="source-accordion-summary">
            <div className="source-summary-title">
              <strong>{(catalog.find(c => c.source === item.source)?.label ?? item.source) + (item.source === "telegram" ? " · @" + item.identifier.replace(/^@/, "") : "")}</strong>
              <span>{item.source === "telegram" ? "Публичный Telegram-канал" : "Источник биржи"}</span>
            </div>
            <span className={"sub-badge source-status-column " + (item.status === "pending_integration" || item.status === "error" ? "pending" : "")}>{item.is_enabled ? "Включён" : "Пауза"}</span>
            <ChevronDown className="source-chevron" size={16} aria-hidden="true" />
          </summary>
          <div className="source-accordion-content">
            <div className="source-details">
              <span>{item.status.replaceAll("_", " ")}</span>
              <span>{item.last_scan_at ? "Последнее сканирование: " + new Date(item.last_scan_at).toLocaleString() : "Сканирование ещё не запускалось"}</span>
              <span>Новых проектов при последнем сканировании: {item.last_discovered_count}</span>
              {item.last_error && <span className="source-error-text">Ошибка: {item.last_error}</span>}
            </div>
            <div className="sub-actions">
              <button className="sub-button" onClick={() => void toggle(item)}>{item.is_enabled ? "Приостановить" : "Включить"}</button>
              <button className="sub-button danger" aria-label="Удалить источник" onClick={() => void remove(item)}><Trash2 size={14}/></button>
            </div>
          </div>
        </details>)}</div>}
    </section>

  </WorkspacePage>;
}
