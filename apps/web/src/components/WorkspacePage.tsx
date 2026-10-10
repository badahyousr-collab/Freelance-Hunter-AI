import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, Bot, ChartNoAxesCombined, Command, LayoutDashboard, Search, Send, Settings2, ShieldCheck, Workflow } from "lucide-react";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Search },
  { href: "/applications", label: "Applications", icon: Send },
  { href: "/sources", label: "Sources", icon: Workflow },
  { href: "/agent", label: "AI Agent", icon: Bot },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/settings", label: "Settings", icon: Settings2 },
  { href: "/security", label: "Security", icon: ShieldCheck },
];

export default function WorkspacePage({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <main className="sub-shell"><aside className="sub-sidebar"><Link className="brand" href="/"><span className="brand-mark"><Command size={21} /></span><span>Freelance<span className="brand-accent">Hunter</span><small>AI WORKSPACE</small></span></Link><div className="workspace-label">WORKSPACE</div><nav className="nav">{nav.map(item => { const Icon = item.icon; return <Link key={item.href} className="nav-item" href={item.href}><Icon size={18} />{item.label}</Link>; })}</nav><div className="sub-sidebar-note"><Activity size={17} /><span>One workspace.<br />Smarter freelance workflows.</span></div></aside><section className="sub-content"><header className="topbar"><div className="breadcrumbs"><Link href="/">Workspace</Link><span>/</span><strong>{title}</strong></div><Link href="/" className="text-link">Dashboard overview →</Link></header><div className="sub-page-heading"><div><div className="eyebrow"><Command size={14} /> FREELANCE HUNTER AI</div><h1>{title}</h1><p>{subtitle}</p></div></div><div className="sub-page-body">{children}</div><footer>Freelance Hunter AI <span>·</span> Your freelance command center</footer></section></main>;
}
