"use client";

import { useEffect, useState } from "react";
import { Activity, BriefcaseBusiness, MessageCircle, Send } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type Summary = {
  projects_found: number; matched_projects: number; proposals_sent: number; client_replies: number;
  telegram_channels_connected: number; marketplaces_connected: number;
  marketplace_public_sources_connected: number; marketplace_sources_enabled: number; telegram_bots_connected: number;
  daily_activity: { day: string; projects_found: number }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(API + "/dashboard/summary", { credentials: "include" })
      .then(async response => {
        if (response.status === 401) { window.location.assign("/login"); return null; }
        const value = await response.json();
        if (!response.ok) throw new Error(value.detail ?? "Не удалось загрузить аналитику");
        return value as Summary;
      })
      .then(value => { if (active && value) setData(value); })
      .catch(caught => { if (active) setError(caught instanceof Error ? caught.message : "Не удалось связаться с API"); });
    return () => { active = false; };
  }, []);

  const cards = [
    { label: "Найдено заказов", key: "projects_found" as const, icon: BriefcaseBusiness },
    { label: "Подходят по профилю", key: "matched_projects" as const, icon: Activity },
    { label: "Отправлено откликов", key: "proposals_sent" as const, icon: Send },
    { label: "Ответы заказчиков", key: "client_replies" as const, icon: MessageCircle },
  ];
  const days = data?.daily_activity ?? [];
  const total = days.reduce((sum, day) => sum + day.projects_found, 0);
  const maximum = Math.max(1, ...days.map(day => day.projects_found));

  return <WorkspacePage title="Аналитика" subtitle="Заказы, отклики и подключённые источники.">
    {error && <div className="sub-alert error" role="alert">{error}</div>}
    <div className="metric-grid">{cards.map(card => { const Icon = card.icon; return <article className="metric-card" key={card.key}><div className="metric-top"><span>{card.label}</span><span className="metric-icon"><Icon size={18} /></span></div><div className="metric-value">{data ? data[card.key] : "—"}</div><div className="metric-change">За всё время</div></article>; })}</div>
    <section className="content-card" style={{ marginTop: 16 }}>
      <div className="panel-heading"><div><h2>Источники и подключения</h2><p>Отдельно показаны API-подключения и площадки с публичным поиском.</p></div></div>
      <div className="sub-list" style={{ marginTop: 16 }}>
        <div className="sub-list-row"><div className="sub-list-main"><strong>Биржи с API-подключением</strong><span>Freelancehunt: официальный API</span></div><strong>{data?.marketplaces_connected ?? "—"}</strong></div>
        <div className="sub-list-row"><div className="sub-list-main"><strong>Биржи с публичным поиском</strong><span>FL.ru и Freelance.ru; отклик отправляется вручную</span></div><strong>{data?.marketplace_public_sources_connected ?? "—"}</strong></div>
        <div className="sub-list-row"><div className="sub-list-main"><strong>Telegram-каналы</strong><span>Включённые каналы с заказами</span></div><strong>{data?.telegram_channels_connected ?? "—"}</strong></div>
        <div className="sub-list-row"><div className="sub-list-main"><strong>Telegram-бот</strong><span>Привязанный к аккаунту бот</span></div><strong>{data?.telegram_bots_connected ?? "—"}</strong></div>
      </div>
    </section>
    <section className="content-card" style={{ marginTop: 16 }}>
      <div className="panel-heading"><div><h2>Новые заказы за 7 дней</h2><p>Количество сохранённых объявлений по дате обнаружения.</p></div><strong>{data ? total : "—"}</strong></div>
      <div className="activity-chart" role="img" aria-label={`Найдено заказов за неделю: ${total}`} style={{ marginTop: 18 }}>
        {days.map(day => <div className="activity-chart-column" key={day.day} title={`${day.projects_found} заказов`}><span style={{ height: `${Math.max(day.projects_found ? 8 : 2, day.projects_found / maximum * 100)}%` }} /><small>{new Date(`${day.day}T00:00:00`).toLocaleDateString("ru-RU", { weekday: "short" })}</small></div>)}
      </div>
    </section>
  </WorkspacePage>;
}

