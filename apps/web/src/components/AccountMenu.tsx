"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, LogOut, Send, Settings2, ShieldCheck, UserRound } from "lucide-react";

const API = "/api/backend";

type Account = {
  identity_provider: string;
  created_at: string | null;
  telegram_user_id: string | null;
  telegram_linked_at: string | null;
  display_name?: string | null;
};

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const refreshProfileName = () => fetch(API + "/profile", { credentials: "include", cache: "no-store" })
      .then(async response => response.ok ? response.json() : null)
      .then(profile => { if (active) setProfileName(typeof profile?.display_name === "string" ? profile.display_name.trim() : ""); })
      .catch(() => { if (active) setProfileName(""); });
    refreshProfileName();
    window.addEventListener("profile-updated", refreshProfileName);
    fetch(API + "/auth/me", { credentials: "include", cache: "no-store" })
      .then(async response => {
        if (response.status === 401) {
          window.location.replace("/login");
          return null;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail ?? "Не удалось загрузить аккаунт");
        return data as Account;
      })
      .then(data => { if (active && data) setAccount(data); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : "Не удалось загрузить аккаунт"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.removeEventListener("profile-updated", refreshProfileName); };
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch(API + "/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      window.location.replace("/login");
    }
  }

  const telegramAccount = account?.identity_provider === "telegram";
  const accountLabel = profileName || (telegramAccount ? "Аккаунт в Telegram" : loading ? "Загрузка аккаунта" : "Аккаунт");
  const avatar = telegramAccount ? <Send size={17} /> : <UserRound size={17} />;

  return (
    <div className="account-menu" ref={root}>
      <button className="account-trigger" type="button" aria-label="Открыть аккаунт" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <span className="account-trigger-avatar">{avatar}</span>
        <span className="account-trigger-copy"><strong>{accountLabel}</strong><small>{telegramAccount ? "Telegram подключён" : "Личное пространство"}</small></span>
        <ChevronDown className={open ? "account-chevron open" : "account-chevron"} size={14} />
      </button>
      {open && (
        <section className="account-popover" aria-label="Account details">
          <div className="account-popover-heading"><span className="account-trigger-avatar">{avatar}</span><div><strong>{accountLabel}</strong><span>{account ? "Signed in" : loading ? "Checking session…" : "Account details unavailable"}</span></div></div>
          {error && <p className="account-error">{error}</p>}
          <div className="account-detail-list">
            <div className="account-detail"><span>Способ входа</span><strong>{telegramAccount ? "Telegram" : loading ? "Загрузка…" : "Недоступен"}</strong></div>
            <div className="account-detail"><span>Telegram</span><strong>{account?.telegram_user_id ? "ID " + account.telegram_user_id : "Not linked"}</strong></div>
            <div className="account-detail"><span>Дата создания</span><strong>{account?.created_at ? new Date(account.created_at).toLocaleDateString() : "Not available"}</strong></div>
            <div className="account-connection"><CheckCircle2 size={15} /><span>{account?.telegram_user_id ? "Telegram connection active" : "Telegram is not linked to this account"}</span></div>
          </div>
          <div className="account-menu-links">
            <Link href="/settings" onClick={() => setOpen(false)}><Settings2 size={15} />Настройки профиля</Link>
            <Link href="/security" onClick={() => setOpen(false)}><ShieldCheck size={15} />Аккаунт и безопасность</Link>
            <button type="button" onClick={() => void signOut()} disabled={signingOut}><LogOut size={15} />{signingOut ? "Signing out…" : "Sign out"}</button>
          </div>
        </section>
      )}
    </div>
  );
}
