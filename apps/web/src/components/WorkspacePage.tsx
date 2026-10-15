import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, Bot, ChartNoAxesCombined, Command, LayoutDashboard, Plug, Search, Send, Settings2, ShieldCheck, Workflow } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Search },
  { href: "/applications", label: "Applications", icon: Send },
  { href: "/sources", label: "Sources", icon: Workflow },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/agent", label: "AI Agent", icon: Bot },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/settings", label: "Settings", icon: Settings2 },
  { href: "/security", label: "Security", icon: ShieldCheck },
];

export default function WorkspacePage({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <main className="sub-shell"><aside className="sub-sidebar"><Link className="brand" href="/dashboard"><span className="brand-mark"><Command size={21} /></span><span>Pipisso<small>FREELANCE HUNTER</small></span></Link><div className="workspace-label">WORKSPACE</div><nav className="nav">{nav.map(item => { const Icon = item.icon; return <Link key={item.href} className="nav-item" href={item.href}><Icon size={18} />{item.label}</Link>; })}</nav><div className="sub-sidebar-note"><Activity size={17} /><span>One Pipisso ecosystem.<br />Freelance Hunter is one of its systems.</span></div></aside><section className="sub-content"><header className="topbar"><div className="breadcrumbs"><Link href="/dashboard">Workspace</Link><span>/</span><strong>{title}</strong></div><Link href="/dashboard" className="text-link">Dashboard overview →</Link></header><div className="sub-page-heading"><div><div className="eyebrow"><Command size={14} /> PIPISSO ECOSYSTEM · FREELANCE HUNTER</div><h1>{title}</h1><p>{subtitle}</p></div></div><div className="sub-page-body">{children}</div><footer>Pipisso <span>·</span> Freelance Hunter — one of the systems in the ecosystem</footer></section></main>;
}
