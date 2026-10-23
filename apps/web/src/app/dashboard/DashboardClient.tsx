"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountMenu from "@/components/AccountMenu";
import {
  Activity, ArrowDownRight, Bot, BriefcaseBusiness, ChartNoAxesCombined,
  Clock3, Code2, FileText, LayoutDashboard, LogOut,
  Search, Send, Settings2, Sparkles, Workflow,
} from "lucide-react";

const API = "/api/backend";
type Summary = {
  projects_found: number; matched_projects: number; proposals_sent: number; client_replies: number;
  telegram_channels_connected: number; marketplaces_connected: number;
  marketplace_public_sources_connected: number; marketplace_sources_enabled: number; telegram_bots_connected: number;
  agent_enabled: number; daily_activity: { day: string; projects_found: number }[];
};
type Project = {
  id: number; source: string; source_project_id: string; url: string; title: string;
  description: string; language: string | null; budget_min: number | null; budget_max: number | null;
  currency: string | null; payment_method: string | null; published_at: string | null;
  discovered_at: string; match_score: number | null; match_reasons: string[];
};
type CurrentUser = { identity_provider?: string; telegram_user_id?: string | null; created_at?: string | null; display_name?: string | null };

const metricDefinitions = [
  { key: "projects_found" as const, label: "Найдено заказов", change: "Все источники", icon: BriefcaseBusiness },
  { key: "matched_projects" as const, label: "Подходят по профилю", change: "По твоим навыкам", icon: Sparkles },
  { key: "proposals_sent" as const, label: "Отправлено откликов", change: "Подтверждено биржей", icon: Send },
  { key: "client_replies" as const, label: "Ответы заказчиков", change: "Отслеженные ответы", icon: Activity },
];

function formatBudget(project: Project): string {
  if (project.budget_min == null && project.budget_max == null) return "Не указан";
  const format = (value: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
  const currency = project.currency ? ` ${project.currency}` : "";
  if (project.budget_min != null && project.budget_max != null && project.budget_min !== project.budget_max) return `${format(project.budget_min)}–${format(project.budget_max)}${currency}`;
  return `${format(project.budget_max ?? project.budget_min ?? 0)}${currency}`;
}

function formatSource(source: string): string {
  const labels: Record<string, string> = {
    telegram: "Telegram",
    fl_ru: "FL.ru",
    freelancehunt: "Freelancehunt",
    freelance_ru: "Freelance.ru",
  };
  return labels[source] ?? source;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        const meResponse = await fetch(`${API}/auth/me`, { credentials: "include" });
        if (meResponse.status === 401) { window.location.replace("/login"); return; }
        if (!meResponse.ok) throw new Error(`Could not verify session (HTTP ${meResponse.status})`);
        const me = await meResponse.json() as CurrentUser;
        const [summaryResponse, projectsResponse, sourcesResponse, profileResponse] = await Promise.all([
          fetch(`${API}/dashboard/summary`, { credentials: "include" }),
          fetch(`${API}/projects?limit=5`, { credentials: "include" }),
          fetch(`${API}/sources`, { credentials: "include" }),
          fetch(`${API}/profile`, { credentials: "include" }),
        ]);
        if (!summaryResponse.ok || !projectsResponse.ok || !sourcesResponse.ok || !profileResponse.ok) throw new Error("Could not load dashboard data");
        const summaryJson = await summaryResponse.json() as unknown;
        const projectsJson = await projectsResponse.json() as unknown;
        const sourcesJson = await sourcesResponse.json() as unknown;
        const profileJson = await profileResponse.json() as { display_name?: string | null };
        const summaryData = summaryJson && typeof summaryJson === "object" ? summaryJson as Summary : null;
        const projectData = Array.isArray(projectsJson) ? projectsJson as Project[] : [];
        const sourceData = Array.isArray(sourcesJson) ? sourcesJson as {is_enabled:boolean;last_scan_at:string|null}[] : [];
        const scanTimes = sourceData.map(source => source.last_scan_at).filter((value): value is string => Boolean(value));
        const latestScan = scanTimes.sort((a,b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
        if (!cancelled) { setUser({ ...me, display_name: typeof profileJson.display_name === "string" ? profileJson.display_name : null }); setSummary(summaryData); setProjects(projectData); setLastScan(latestScan); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not connect to the API");
      } finally { if (!cancelled) setLoading(false); }
    }
    void loadDashboard();
    return () => { cancelled = true; };
  }, []);

  async function signOut() {
    setSigningOut(true);
    try { await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" }); }
    finally { window.location.replace("/login"); }
  }

  if (!loading && error && !user) {
    return <main className="auth-shell"><section className="auth-card"><div className="auth-eyebrow">ПРОВЕРКА СЕССИИ</div><h1>Не удалось проверить вход</h1><p className="auth-subtitle">{error}. Войди ещё раз или создай аккаунт.</p><div className="auth-footer"><Link href="/login">Войти</Link> · <Link href="/register">Создать аккаунт</Link></div></section></main>;
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard"><span className="brand-mark"><Code2 size={21} /></span><span>Pipisso ByteCraft<small>САЙТЫ · БОТЫ · АВТОМАТИЗАЦИЯ</small></span></Link>
        <div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav className="nav">
          <Link className="nav-item active" href="/dashboard"><LayoutDashboard size={18} />Обзор</Link>
          <Link className="nav-item" href="/projects"><Search size={18} />Проекты</Link>
          <Link className="nav-item" href="/applications"><Send size={18} />Отклики</Link>
          <Link className="nav-item" href="/sources"><Workflow size={18} />Источники</Link>
          <Link className="nav-item" href="/agent"><Bot size={18} />AI-агент</Link>
        </nav>
        <div className="workspace-label settings-label">АККАУНТ</div>
        <nav className="nav"><Link className="nav-item" href="/settings"><Settings2 size={18} />Настройки</Link></nav>
        <div className="profile"><div className="avatar">P</div><div className="profile-text"><strong>{user?.display_name?.trim() || (user?.identity_provider === "telegram" ? "Аккаунт в Telegram" : loading ? "Проверяем сессию…" : "Аккаунт")}</strong><span>{user?.identity_provider === "telegram" ? "Telegram подключён" : "Личное пространство"}</span></div><button className="profile-logout" aria-label="Выйти" onClick={signOut} disabled={signingOut}><LogOut size={16} /></button></div>
      </aside>

      <section className="content">
        <header className="topbar"><div className="breadcrumbs">Рабочее пространство <span>/</span> <strong>Обзор</strong></div><div className="top-actions"><span className="live-status preview-status"><i />{loading ? "Проверяем сессию" : user ? "Аккаунт подключён" : "Сессия недоступна"}</span><Link className="icon-button" href="/analytics" aria-label="Открыть аналитику" title="Аналитика"><ChartNoAxesCombined size={17} /></Link><button className="icon-button" aria-label="Обновить обзор" onClick={() => window.location.reload()}><Activity size={18} /></button><AccountMenu /></div></header>
        <div className="page-heading"><div><div className="eyebrow"><Sparkles size={14} /> BYTECRAFT · FREELANCE HUNTER</div><h1>С возвращением <span>✦</span></h1><p>Поиск заказов и AI-отклики от ByteCraft.</p></div><Link className="primary-button" href="/sources"><Search size={17} />Подключить источники</Link></div>

        {error && <div className="dashboard-alert" role="alert">{error}. Проверь подключение и обнови страницу.</div>}
        <section className="metric-grid" aria-label="Сводная статистика">
          {metricDefinitions.map((metric) => { const Icon = metric.icon; const value = summary ? summary[metric.key] : "—"; return <article className="metric-card" key={metric.key}><div className="metric-top"><span>{metric.label}</span><span className="metric-icon"><Icon size={18} /></span></div><div className="metric-value">{loading ? "—" : value}</div><div className="metric-change">{metric.change}</div></article>; })}
        </section>

        <section className="main-grid">
          <article className="panel activity-panel"><div className="panel-heading"><div><h2>Заказы за неделю</h2><p>Новые публикации по дням</p></div><span className="select-button"><Clock3 size={14} /> 7 дней</span></div>
            {(() => { const days = summary?.daily_activity ?? []; const maximum = Math.max(1, ...days.map(day => day.projects_found)); const total = days.reduce((sum, day) => sum + day.projects_found, 0); return <><div className="chart-summary"><strong>{loading ? "—" : total}<span> заказов</span></strong></div><div className="activity-chart" role="img" aria-label={`Найдено заказов за неделю: ${total}`}>{days.map(day => <div className="activity-chart-column" key={day.day} title={`${day.projects_found} заказов`}><span style={{ height: `${Math.max(day.projects_found ? 8 : 2, day.projects_found / maximum * 100)}%` }} /><small>{new Date(`${day.day}T00:00:00`).toLocaleDateString("ru-RU", { weekday: "short" })}</small></div>)}</div></>; })()}
          </article>
          <article className="panel agent-panel"><div className="panel-heading"><div><h2>AI-агент</h2><p>Состояние поиска</p></div><span className={"status-pill " + (summary?.agent_enabled ? "" : "pending")}><i />{summary?.agent_enabled ? "Работает" : "Приостановлен"}</span></div><div className="agent-orb"><div className="orb-ring"><div className="orb-core"><Bot size={28} /></div></div><span className="orb-spark spark-one">✦</span><span className="orb-spark spark-two">✧</span></div><p className="agent-description">Источники поиска</p><div className="agent-stats source-counts"><div><span>Биржи</span><strong>{loading ? "—" : summary?.marketplace_sources_enabled ?? 0}</strong><small>{loading ? "" : `${summary?.marketplaces_connected ?? 0} API · ${summary?.marketplace_public_sources_connected ?? 0} публичных`}</small></div><div><span>TG-каналы</span><strong>{loading ? "—" : summary?.telegram_channels_connected ?? 0}</strong></div><div><span>TG-боты</span><strong>{loading ? "—" : summary?.telegram_bots_connected ?? 0}</strong></div></div><p className="last-scan">{lastScan ? `Последний поиск: ${new Date(lastScan).toLocaleString("ru-RU")}` : "Поиск ещё не запускался"}</p><Link className="secondary-button button-link" href="/agent"><Settings2 size={16} />Настроить агента</Link></article>
        </section>

        <section className="panel projects-panel"><div className="panel-heading"><div><h2>Новые проекты</h2><p>Последние объявления из подключённых источников</p></div><Link className="text-link" href="/projects">Все проекты <ArrowDownRight size={15} /></Link></div>
          <div className="table-wrap"><table><thead><tr><th>ПРОЕКТ</th><th>ИСТОЧНИК</th><th>БЮДЖЕТ</th><th>СОВПАДЕНИЕ</th><th>СТАТУС</th><th /></tr></thead><tbody>
            {projects.map(project => <tr key={project.id}><td><a className="project-title" href={project.url} target="_blank" rel="noreferrer">{project.title}</a><div className="project-detail">{String(project.description ?? "").slice(0, 100) || "Описание не предоставлено"}</div></td><td><span className="source-label">{formatSource(project.source)}</span></td><td className="budget">{formatBudget(project)}</td><td>{project.match_score == null ? <span className="muted-value">Не оценён</span> : <div className="match-cell"><div className="match-track"><span style={{ width: `${project.match_score}%` }} /></div><strong>{project.match_score}%</strong></div>}</td><td><span className="project-status blue">Найден</span></td><td><a className="more-button" href={project.url} target="_blank" rel="noreferrer" aria-label={`Открыть ${project.title}`}>↗</a></td></tr>)}
            {!loading && projects.length === 0 && <tr><td colSpan={6}><div className="table-empty"><FileText size={22} /><strong>Заказов пока нет</strong><span>Подключи фриланс-биржу или Telegram-канал, чтобы собирать объявления.</span><Link href="/sources">Подключить источники <ArrowDownRight size={14} /></Link></div></td></tr>}
          </tbody></table></div>
        </section>
        <footer>ByteCraft <span>·</span> Поиск фриланс-заказов и автоматизация откликов</footer>
      </section>
    </main>
  );
}
