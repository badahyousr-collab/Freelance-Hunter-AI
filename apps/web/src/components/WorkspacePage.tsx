import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, Bot, Command, LayoutDashboard, Search, Send, Settings2, Workflow } from "lucide-react";
import AccountMenu from "@/components/AccountMenu";

const nav = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/projects", label: "Проекты", icon: Search },
  { href: "/applications", label: "Отклики", icon: Send },
  { href: "/sources", label: "Источники", icon: Workflow },
  { href: "/agent", label: "AI-агент", icon: Bot },
  { href: "/settings", label: "Настройки", icon: Settings2 },
];

export default function WorkspacePage({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <main className="sub-shell"><aside className="sub-sidebar"><Link className="brand" href="/dashboard"><span className="brand-mark"><Command size={21} /></span><span>Pipisso<small>FREELANCE HUNTER</small></span></Link><div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div><nav className="nav">{nav.map(item => { const Icon = item.icon; return <Link key={item.href} className="nav-item" href={item.href}><Icon size={18} />{item.label}</Link>; })}</nav><div className="sub-sidebar-note"><Activity size={17} /><span>Одна экосистема Pipisso.<br />Freelance Hunter - один из её модулей.</span></div></aside><section className="sub-content"><header className="topbar"><div className="breadcrumbs"><Link href="/dashboard">Рабочее пространство</Link><span>/</span><strong>{title}</strong></div><div className="top-actions"><Link href="/dashboard" className="text-link">Обзор панели <span aria-hidden="true">↗</span></Link><AccountMenu /></div></header><div className="sub-page-heading"><div><div className="eyebrow"><Command size={14} /> PIPISSO · ПОИСК ФРИЛАНС-ЗАКАЗОВ</div><h1>{title}</h1><p>{subtitle}</p></div></div><div className="sub-page-body">{children}</div><footer>Pipisso <span>·</span> Freelance Hunter - один из модулей экосистемы</footer></section></main>;
}
