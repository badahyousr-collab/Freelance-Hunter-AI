"use client";

import { useEffect, useState } from "react";
import { Link2, LogOut, ShieldCheck, Unlink } from "lucide-react";
import WorkspacePage from "@/components/WorkspacePage";

const API = "/api/backend";
type User = { auth_method?: string; created_at: string | null; telegram_user_id?: string | null };
type AgentSettings = { enabled: boolean; telegram_linked: boolean };

export default function SecurityPage() {
  const [user, setUser] = useState<User | null>(null);
  const [agent, setAgent] = useState<AgentSettings | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");

  async function load() {
    try {
      const rs = await Promise.all([
        fetch(API + "/auth/me", { credentials: "include" }),
        fetch(API + "/agent/settings", { credentials: "include" })
      ]);
      if (rs.some(r => r.status === 401)) { window.location.assign("/login"); return; }
      const u = await rs[0].json();
      const a = await rs[1].json();
      if (!rs[0].ok || !rs[1].ok) throw new Error("Не удалось загрузить настройки аккаунта");
      setUser(u);
      setAgent(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка соединения с API");
    }
  }

  useEffect(() => { void load(); }, []);

  async function generateCode() {
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch(API + "/telegram/link-code", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail ?? "Не удалось создать код привязки");
      setCode(d.code);
      setMessage("Код действует " + Math.floor(d.expires_in_seconds / 60) + " минут и используется один раз.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать код");
    } finally { setBusy(false); }
  }

  async function unlink() {
    setBusy(true); setError("");
    try {
      const r = await fetch(API + "/telegram/link", { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("Не удалось отвязать Telegram");
      setCode(""); setMessage("Telegram отвязан."); await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отвязать Telegram");
    } finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    try { await fetch(API + "/auth/logout", { method: "POST", credentials: "include" }); }
    finally { window.location.assign("/login"); }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText("/link " + code);
      setMessage("Команда для бота скопирована.");
    } catch {
      setMessage("Отправь боту команду /link " + code);
    }
  }

  return <WorkspacePage title="Безопасность" subtitle="Управление Telegram-подключением и текущей сессией.">
    {error && <div className="sub-alert error">{error}</div>}
    {message && <div className="sub-alert">{message}</div>}
    <section className="content-card">
      <h2><ShieldCheck size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />Защита аккаунта</h2>
      <p>Вход выполняется через Telegram. Почта и пароль для аккаунта не используются. Сессия хранится в защищённой HTTP-only cookie.</p>
      <div className="sub-list">
        <div className="sub-list-row"><div className="sub-list-main"><strong>Способ входа</strong><span>Telegram</span></div><span className="sub-badge">Активен</span></div>
        <div className="sub-list-row"><div className="sub-list-main"><strong>Аккаунт создан</strong><span>{user?.created_at ? new Date(user.created_at).toLocaleString() : "Загрузка…"}</span></div></div>
      </div>
      <button className="sub-button danger" onClick={logout} disabled={busy} style={{ marginTop: 16 }}><LogOut size={15} />{busy ? "Выходим…" : "Выйти из аккаунта"}</button>
    </section>
    <section className="content-card">
      <h2><Link2 size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />Telegram-бот</h2>
      <p>Привяжи этот аккаунт к боту, чтобы получать статистику, смотреть проекты и управлять AI-агентом. Привязка подтверждается одноразовым кодом.</p>
      <div className="sub-list-row"><div className="sub-list-main"><strong>Статус</strong><span>{agent?.telegram_linked ? "Telegram-аккаунт привязан." : "Telegram-аккаунт не привязан к рабочему пространству."}</span></div><span className={"sub-badge " + (agent?.telegram_linked ? "" : "pending")}>{agent?.telegram_linked ? "Привязан" : "Не привязан"}</span></div>
      {!agent?.telegram_linked && <><button className="sub-button primary" style={{ marginTop: 14 }} onClick={generateCode} disabled={busy}><Link2 size={15} />{busy ? "Создаём…" : "Создать одноразовый код"}</button>{code && <div className="link-code-box"><code>{code}</code><button className="sub-button" onClick={copyCode}>Копировать /link</button><span>Открой бота и отправь <strong>/link {code}</strong></span></div>}</>}
      {agent?.telegram_linked && <button className="sub-button danger" style={{ marginTop: 14 }} onClick={unlink} disabled={busy}><Unlink size={14} />Отвязать Telegram</button>}
    </section>
  </WorkspacePage>;
}
