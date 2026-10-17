"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, Workflow, ExternalLink, Radio } from "lucide-react";
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
  const [source, setSource] = useState("telegram");
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [addingChannel, setAddingChannel] = useState("");
  const [scanning, setScanning] = useState(false);
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

  async function saveSource(sourceType: string, channel: string) {
    const r = await fetch(API + "/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ source: sourceType, identifier: channel, is_enabled: true })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.detail ?? "Не удалось добавить источник");
    return d as Source;
  }

  async function add(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      await saveSource(source, identifier.trim());
      setMessage("Источник добавлен. Запусти сканирование и проверь, появились ли новые проекты.");
      setIdentifier(""); await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить источник");
    } finally { setBusy(false); }
  }

  async function addRecommended(channel: RecommendedChannel) {
    setAddingChannel(channel.handle); setError(""); setMessage("");
    try {
      await saveSource("telegram", "@" + channel.handle);
      setMessage("Канал @" + channel.handle + " добавлен. Результат сбора можно проверить после сканирования.");
      await load();
    } catch (e) {
      const text = e instanceof Error ? e.message : "Не удалось добавить канал";
      if (/already configured|already exists|уже настроен|уже добавлен/i.test(text)) {
        setMessage("Канал @" + channel.handle + " уже есть в твоих источниках.");
      } else setError(text);
    } finally { setAddingChannel(""); }
  }

  async function scanNow() {
    setScanning(true); setError(""); setMessage("");
    try {
      const r = await fetch(API + "/agent/scan", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "Не удалось запустить сканирование");
      const problems = Array.isArray(d.errors) && d.errors.length ? " Ошибки: " + d.errors.join("; ") : "";
      setMessage("Сканирование завершено. Источников: " + Number(d.scannedSources ?? 0) + ", новых проектов: " + Number(d.newProjects ?? 0) + "." + problems);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось запустить сканирование");
    } finally { setScanning(false); }
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

  const selected = catalog.find(c => c.source === source);
  const configuredHandles = new Set(items.filter(item => item.source === "telegram").map(item => item.identifier.replace(/^@/, "").toLowerCase()));

  return <WorkspacePage title="Источники" subtitle="Собирай заказы из публичных Telegram-каналов и официального Freelancehunt API.">
    {error && <div className="sub-alert error" role="alert">{error}</div>}
    {message && <div className="sub-alert" role="status">{message}</div>}

    <section className="content-card">
      <div className="panel-heading"><div><h2>Подборка Telegram-каналов</h2><p>Каналы с заказами и проектами. Нажми «Добавить», затем запусти сканирование. Актуальность проверяется по результату, а не только по наличию ссылки.</p></div><Radio size={18}/></div>
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
      <div className="panel-heading"><div><h2>Биржи и другие источники</h2><p>Биржи будут отмечаться рабочими только после реализации адаптера и теста получения реальных объявлений.</p></div><Link className="sub-button" href="/integrations">Подключения ↗</Link></div>
      <form className="sub-form" onSubmit={add}>
        <div className="sub-form-grid">
          <div className="sub-form-field"><label htmlFor="source-kind">Тип источника</label><select id="source-kind" className="sub-select" value={source} onChange={e => setSource(e.target.value)}>{catalog.map(c => <option key={c.source} value={c.source}>{c.label}</option>)}</select></div>
          <div className="sub-form-field"><label htmlFor="source-id">{source === "telegram" ? "Имя публичного канала" : source === "freelancehunt" ? "Для Freelancehunt не требуется" : "Идентификатор (если нужен)"}</label><input id="source-id" className="sub-input" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={source === "telegram" ? "@python_jobs" : source === "freelancehunt" ? "Оставь пустым" : "Необязательно"} required={source === "telegram"}/></div>
        </div>
        {selected && <div className="sub-muted">{selected.setup_note}</div>}
        <button className="sub-button primary" disabled={busy} type="submit"><Plus size={15}/>{busy ? "Сохраняем…" : "Добавить источник"}</button>
      </form>
    </section>

    <section className="content-card">
      <div className="panel-heading"><div><h2>Подключённые источники</h2><p>Здесь отображается состояние источника и результат последнего сканирования.</p></div><div className="sub-actions"><button className="sub-button" onClick={() => void load()} disabled={loading || scanning}><RefreshCw size={14}/>Обновить</button><button className="sub-button primary" onClick={() => void scanNow()} disabled={loading || scanning || !items.some(item => ["telegram","freelancehunt"].includes(item.source) && item.is_enabled)}><Radio size={14}/>{scanning ? "Сканируем…" : "Сканировать сейчас"}</button></div></div>
      {loading ? <div className="sub-empty">Загружаем источники…</div> : items.length === 0 ? <div className="sub-empty"><Workflow size={25}/><strong>Источники пока не добавлены</strong><span>Добавь канал из подборки выше или укажи публичный Telegram-канал вручную.</span></div> :
        <div className="sub-list">{items.map(item => <article className="sub-list-row" key={item.id}>
          <div className="sub-list-main">
            <strong>{(catalog.find(c => c.source === item.source)?.label ?? item.source) + (item.source === "telegram" ? " · @" + item.identifier.replace(/^@/, "") : "")}</strong>
            <span>{(item.source === "telegram" ? "Публичный Telegram-канал" : "Источник биржи") + " · " + item.status.replaceAll("_", " ")}</span>
            <span>{(item.last_scan_at ? "Последнее сканирование: " + new Date(item.last_scan_at).toLocaleString() : "Сканирование ещё не запускалось") + " · Новых проектов: " + item.last_discovered_count + (item.last_error ? " · Ошибка: " + item.last_error : "")}</span>
          </div>
          <span className={"sub-badge " + (item.status === "pending_integration" || item.status === "error" ? "pending" : "")}>{item.is_enabled ? "Включён" : "Пауза"}</span>
          <div className="sub-actions"><button className="sub-button" onClick={() => void toggle(item)}>{item.is_enabled ? "Пауза" : "Включить"}</button><button className="sub-button danger" aria-label="Удалить источник" onClick={() => void remove(item)}><Trash2 size={14}/></button></div>
        </article>)}</div>}
    </section>

    <section className="content-card">
      <h2>Статус адаптеров</h2>
      <p>Публичные Telegram-каналы поддерживаются сканером превью. Freelancehunt требует подключённый и проверенный API-токен; остальные площадки не будут помечаться как активные до реализации разрешённого адаптера.</p>
      <div className="sub-list">{catalog.map(c => <div className="sub-list-row" key={c.source}><div className="sub-list-main"><strong>{c.label}</strong><span>{c.setup_note}</span></div><span className={"sub-badge " + (["telegram","freelancehunt"].includes(c.source) ? "" : "pending")}>{c.source === "telegram" ? "Сканер реализован" : c.source === "freelancehunt" ? "Официальный API адаптер" : "Адаптер ожидается"}</span></div>)}</div>
    </section>
  </WorkspacePage>;
}
