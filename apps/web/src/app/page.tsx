import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  CircleHelp,
  Clock3,
  Command,
  FileText,
  LayoutDashboard,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

const metrics = [
  { label: "Projects found", value: "248", change: "+18.4%", positive: true, icon: BriefcaseBusiness },
  { label: "Matched projects", value: "36", change: "+12.8%", positive: true, icon: Sparkles },
  { label: "Proposals sent", value: "18", change: "This month", positive: true, icon: Send },
  { label: "Client replies", value: "5", change: "27.8% reply rate", positive: true, icon: Activity },
];

const projects = [
  { title: "Telegram bot automation", detail: "Python · Telegram Bot API", source: "Telegram", budget: "$150–300", match: 96, status: "Review", tone: "violet" },
  { title: "Python API integration", detail: "REST API · Webhooks", source: "Freelancer", budget: "$200–450", match: 91, status: "Draft ready", tone: "blue" },
  { title: "AI content workflow", detail: "LLM · Workflow automation", source: "Kwork", budget: "15 000 ₽", match: 87, status: "Sent", tone: "green" },
];

const activities = [
  { title: "New matching project discovered", time: "4 min ago", icon: Search },
  { title: "Proposal draft generated", time: "18 min ago", icon: FileText },
  { title: "Telegram source scanned", time: "26 min ago", icon: Workflow },
];

export default function DashboardPage() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark"><Command size={21} /></span><span>Freelance<span className="brand-accent">Hunter</span><small>AI WORKSPACE</small></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav">
          <a className="nav-item active" href="#"><LayoutDashboard size={18} />Overview</a>
          <a className="nav-item" href="#"><Search size={18} />Projects<span className="nav-count">36</span></a>
          <a className="nav-item" href="#"><Send size={18} />Applications</a>
          <a className="nav-item" href="#"><Workflow size={18} />Sources</a>
          <a className="nav-item" href="#"><Bot size={18} />AI Agent</a>
          <a className="nav-item" href="#"><ChartNoAxesCombined size={18} />Analytics</a>
        </nav>
        <div className="workspace-label settings-label">PREFERENCES</div>
        <nav className="nav">
          <a className="nav-item" href="#"><Settings2 size={18} />Settings</a>
          <a className="nav-item" href="#"><ShieldCheck size={18} />Security</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-icon"><CircleHelp size={17} /></div>
          <div><strong>Need a hand?</strong><span>Visit the help center</span></div>
        </div>
        <div className="profile">
          <div className="avatar">FH</div>
          <div className="profile-text"><strong>Your workspace</strong><span>Personal account</span></div>
          <Settings2 size={17} className="profile-settings" />
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="top-actions"><span className="live-status"><i /> Agent running</span><button className="icon-button" aria-label="Activity"><Activity size={18} /></button><div className="user-avatar">FH</div></div>
        </header>

        <div className="page-heading">
          <div><div className="eyebrow"><Sparkles size={14} /> YOUR FREELANCE COMMAND CENTER</div><h1>Good afternoon <span>✦</span></h1><p>Here&apos;s what&apos;s happening with your freelance search.</p></div>
          <button className="primary-button"><Search size={17} />Run search</button>
        </div>

        <section className="metric-grid" aria-label="Summary statistics">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return <article className="metric-card" key={metric.label}><div className="metric-top"><span>{metric.label}</span><span className="metric-icon"><Icon size={18} /></span></div><div className="metric-value">{metric.value}</div><div className={`metric-change ${metric.positive ? "positive" : ""}`}>{metric.positive && <ArrowUpRight size={14} />}{metric.change}</div></article>;
          })}
        </section>

        <section className="main-grid">
          <article className="panel activity-panel">
            <div className="panel-heading"><div><h2>Search activity</h2><p>Projects discovered over the last 7 days</p></div><button className="select-button">Last 7 days <Clock3 size={14} /></button></div>
            <div className="chart-summary"><strong>248 <span>projects</span></strong><span className="chart-trend"><ArrowUpRight size={15} /> 18.4%</span></div>
            <div className="chart" role="img" aria-label="Illustrative search activity chart for seven days">
              <div className="chart-grid"><span>80</span><span>60</span><span>40</span><span>20</span></div>
              <svg viewBox="0 0 660 170" preserveAspectRatio="none" aria-hidden="true">
                <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9275ff" stopOpacity=".30" /><stop offset="100%" stopColor="#9275ff" stopOpacity="0" /></linearGradient></defs>
                <path d="M0 130 C38 118 55 125 94 96 S150 110 190 79 S245 95 285 62 S340 90 378 55 S435 74 472 44 S530 65 565 30 S620 44 660 16 L660 170 L0 170 Z" fill="url(#chartFill)" />
                <path d="M0 130 C38 118 55 125 94 96 S150 110 190 79 S245 95 285 62 S340 90 378 55 S435 74 472 44 S530 65 565 30 S620 44 660 16" fill="none" stroke="#9b83ff" strokeWidth="3" strokeLinecap="round" />
                <circle cx="472" cy="44" r="5" fill="#151821" stroke="#b4a3ff" strokeWidth="3" />
              </svg>
            </div>
            <div className="chart-days"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
          </article>

          <article className="panel agent-panel">
            <div className="panel-heading"><div><h2>AI Agent</h2><p>Automation status</p></div><span className="status-pill running"><i />Running</span></div>
            <div className="agent-orb"><div className="orb-ring"><div className="orb-core"><Bot size={28} /></div></div><span className="orb-spark spark-one">✦</span><span className="orb-spark spark-two">✧</span></div>
            <h3>Your agent is on the hunt</h3><p className="agent-description">Scanning connected sources and matching new projects to your skills.</p>
            <div className="agent-stats"><div><span>Active sources</span><strong>12</strong></div><div><span>Last scan</span><strong>4 min ago</strong></div></div>
            <button className="secondary-button"><Settings2 size={16} />Configure agent</button>
          </article>
        </section>

        <section className="panel projects-panel">
          <div className="panel-heading"><div><h2>Recent projects</h2><p>Fresh opportunities matched to your profile</p></div><a className="text-link" href="#">View all projects <ArrowDownRight size={15} /></a></div>
          <div className="table-wrap"><table><thead><tr><th>PROJECT</th><th>SOURCE</th><th>BUDGET</th><th>AI MATCH</th><th>STATUS</th><th /></tr></thead><tbody>{projects.map((project) => <tr key={project.title}><td><div className="project-title">{project.title}</div><div className="project-detail">{project.detail}</div></td><td><span className="source-label">{project.source}</span></td><td className="budget">{project.budget}</td><td><div className="match-cell"><div className="match-track"><span style={{ width: `${project.match}%` }} /></div><strong>{project.match}%</strong></div></td><td><span className={`project-status ${project.tone}`}>{project.status}</span></td><td><button className="more-button" aria-label={`More actions for ${project.title}`}>···</button></td></tr>)}</tbody></table></div>
        </section>

        <section className="panel recent-panel">
          <div className="panel-heading"><div><h2>Recent activity</h2><p>A live feed of your agent&apos;s work</p></div><a className="text-link" href="#">Activity log <ArrowDownRight size={15} /></a></div>
          <div className="activity-list">{activities.map((activity) => { const Icon = activity.icon; return <div className="activity-row" key={activity.title}><span className="activity-icon"><Icon size={16} /></span><span className="activity-title">{activity.title}</span><span className="activity-time">{activity.time}</span></div>; })}</div>
        </section>
        <footer>Freelance Hunter AI <span>·</span> Built for smarter freelance workflows</footer>
      </section>
    </main>
  );
}
