"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountMenu from "@/components/AccountMenu";
import {
  Activity, ArrowDownRight, Bot, BriefcaseBusiness, ChartNoAxesCombined,
  CircleHelp, Clock3, Command, FileText, LayoutDashboard, LogOut,
  Search, Send, Settings2, ShieldCheck, Sparkles, Workflow,
} from "lucide-react";

const API = "/api/backend";
type Summary = { projects_found: number; matched_projects: number; proposals_sent: number; client_replies: number };
type Project = {
  id: number; source: string; source_project_id: string; url: string; title: string;
  description: string; language: string | null; budget_min: number | null; budget_max: number | null;
  currency: string | null; payment_method: string | null; published_at: string | null;
  discovered_at: string; match_score: number | null; match_reasons: string[];
};
type CurrentUser = { identity_provider?: string; telegram_user_id?: string | null; created_at?: string | null; display_name?: string | null };

const metricDefinitions = [
  { key: "projects_found" as const, label: "Projects found", change: "All sources", icon: BriefcaseBusiness },
  { key: "matched_projects" as const, label: "Matched projects", change: "Based on your profile", icon: Sparkles },
  { key: "proposals_sent" as const, label: "Proposals sent", change: "Confirmed submissions", icon: Send },
  { key: "client_replies" as const, label: "Client replies", change: "Tracked responses", icon: Activity },
];

function formatBudget(project: Project): string {
  if (project.budget_min == null && project.budget_max == null) return "Not specified";
  const format = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
  const currency = project.currency ? ` ${project.currency}` : "";
  if (project.budget_min != null && project.budget_max != null && project.budget_min !== project.budget_max) return `${format(project.budget_min)}–${format(project.budget_max)}${currency}`;
  return `${format(project.budget_max ?? project.budget_min ?? 0)}${currency}`;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [enabledSources, setEnabledSources] = useState(0);
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
        if (!cancelled) { setUser({ ...me, display_name: typeof profileJson.display_name === "string" ? profileJson.display_name : null }); setSummary(summaryData); setProjects(projectData); setEnabledSources(sourceData.filter(source => source.is_enabled).length); setLastScan(latestScan); }
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
    return <main className="auth-shell"><section className="auth-card"><div className="auth-eyebrow">SESSION CHECK</div><h1>Could not verify your session</h1><p className="auth-subtitle">{error}. Sign in again, or create an account if you do not have one yet.</p><div className="auth-footer"><Link href="/login">Sign in</Link> · <Link href="/register">Create account</Link></div></section></main>;
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard"><span className="brand-mark"><Command size={21} /></span><span>Pipisso<small>FREELANCE HUNTER</small></span></Link>
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
        <div className="sidebar-bottom"><div className="help-icon"><CircleHelp size={17} /></div><div><strong>Need a hand?</strong><span>Project setup guide</span></div></div>
        <div className="profile"><div className="avatar">P</div><div className="profile-text"><strong>{user?.display_name?.trim() || (user?.identity_provider === "telegram" ? "Аккаунт в Telegram" : loading ? "Проверяем сессию…" : "Аккаунт")}</strong><span>{user?.identity_provider === "telegram" ? "Telegram подключён" : "Личное пространство"}</span></div><button className="profile-logout" aria-label="Sign out" onClick={signOut} disabled={signingOut}><LogOut size={16} /></button></div>
      </aside>

      <section className="content">
        <header className="topbar"><div className="breadcrumbs">Рабочее пространство <span>/</span> <strong>Обзор</strong></div><div className="top-actions"><span className="live-status preview-status"><i />{loading ? "Проверяем сессию" : user ? "Аккаунт подключён" : "Сессия недоступна"}</span><Link className="icon-button" href="/analytics" aria-label="Open analytics" title="Analytics"><ChartNoAxesCombined size={17} /></Link><button className="icon-button" aria-label="Refresh dashboard" onClick={() => window.location.reload()}><Activity size={18} /></button><AccountMenu /></div></header>
        <div className="page-heading"><div><div className="eyebrow"><Sparkles size={14} /> PIPISSO ECOSYSTEM · FREELANCE HUNTER</div><h1>Welcome back <span>✦</span></h1><p>Freelance Hunter — one of the systems inside Pipisso.</p></div><Link className="primary-button" href="/sources"><Search size={17} />Set up sources</Link></div>

        {error && <div className="dashboard-alert" role="alert">{error}. Check that the backend is running and try refreshing.</div>}
        <section className="metric-grid" aria-label="Summary statistics">
          {metricDefinitions.map((metric) => { const Icon = metric.icon; const value = summary ? summary[metric.key] : "—"; return <article className="metric-card" key={metric.key}><div className="metric-top"><span>{metric.label}</span><span className="metric-icon"><Icon size={18} /></span></div><div className="metric-value">{loading ? "—" : value}</div><div className="metric-change">{metric.change}</div></article>; })}
        </section>

        <section className="main-grid">
          <article className="panel activity-panel"><div className="panel-heading"><div><h2>Search activity</h2><p>Project discovery history</p></div><span className="select-button"><Clock3 size={14} /> All time</span></div>
            <div className="empty-chart"><div className="empty-chart-icon"><ChartNoAxesCombined size={24} /></div><strong>{loading ? "Loading activity…" : summary?.projects_found ? "Activity will appear here" : "Your first scan starts here"}</strong><p>Once sources are connected and scans run, this panel will show real discovery activity.</p></div>
          </article>
          <article className="panel agent-panel"><div className="panel-heading"><div><h2>AI Agent</h2><p>Automation status</p></div><span className="status-pill pending"><i />Setup pending</span></div><div className="agent-orb"><div className="orb-ring"><div className="orb-core"><Bot size={28} /></div></div><span className="orb-spark spark-one">✦</span><span className="orb-spark spark-two">✧</span></div><h3>Ready when you are</h3><p className="agent-description">Connect your first sources and configure your matching preferences to start discovering projects.</p><div className="agent-stats"><div><span>Enabled source configs</span><strong>{enabledSources}</strong></div><div><span>Last scan</span><strong>{lastScan ? new Date(lastScan).toLocaleString() : "Not started"}</strong></div></div><Link className="secondary-button button-link" href="/agent"><Settings2 size={16} />Configure agent</Link></article>
        </section>

        <section className="panel projects-panel"><div className="panel-heading"><div><h2>Recent projects</h2><p>Latest projects collected from your sources</p></div><Link className="text-link" href="/projects">View all projects <ArrowDownRight size={15} /></Link></div>
          <div className="table-wrap"><table><thead><tr><th>PROJECT</th><th>SOURCE</th><th>BUDGET</th><th>AI MATCH</th><th>STATUS</th><th /></tr></thead><tbody>
            {projects.map(project => <tr key={project.id}><td><a className="project-title" href={project.url} target="_blank" rel="noreferrer">{project.title}</a><div className="project-detail">{String(project.description ?? "").slice(0, 100) || "No description provided"}</div></td><td><span className="source-label">{project.source}</span></td><td className="budget">{formatBudget(project)}</td><td>{project.match_score == null ? <span className="muted-value">Not scored</span> : <div className="match-cell"><div className="match-track"><span style={{ width: `${project.match_score}%` }} /></div><strong>{project.match_score}%</strong></div>}</td><td><span className="project-status blue">Collected</span></td><td><a className="more-button" href={project.url} target="_blank" rel="noreferrer" aria-label={`Open ${project.title}`}>↗</a></td></tr>)}
            {!loading && projects.length === 0 && <tr><td colSpan={6}><div className="table-empty"><FileText size={22} /><strong>No projects yet</strong><span>Connect a marketplace or Telegram channel to begin collecting listings.</span><Link href="/sources">Connect sources <ArrowDownRight size={14} /></Link></div></td></tr>}
          </tbody></table></div>
        </section>
        <section className="panel recent-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Confirmed events from your workspace</p></div></div><div className="activity-list"><div className="activity-row"><span className="activity-icon"><ShieldCheck size={16} /></span><span className="activity-title">Account workspace loaded</span><span className="activity-time">{loading ? "Loading" : "Just now"}</span></div><div className="activity-row"><span className="activity-icon"><Workflow size={16} /></span><span className="activity-title">Source ingestion will appear here after setup</span><span className="activity-time">—</span></div></div></section>
        <footer>Pipisso <span>·</span> Freelance Hunter — one ecosystem, connected systems</footer>
      </section>
    </main>
  );
}
