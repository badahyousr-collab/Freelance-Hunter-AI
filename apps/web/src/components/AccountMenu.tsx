"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, LogOut, Send, Settings2, ShieldCheck, UserRound } from "lucide-react";

const API = "/api/backend";

type Account = {
  email: string | null;
  is_verified: boolean;
  auth_method: string;
  created_at: string | null;
  telegram_user_id: string | null;
  telegram_linked_at: string | null;
};

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
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
    return () => { active = false; };
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

  const telegramAccount = account?.auth_method === "telegram";
  const avatar = telegramAccount ? <Send size={17} /> : <UserRound size={17} />;

  return (
    <div className="account-menu" ref={root}>
      <button className="account-trigger" type="button" aria-label="Открыть аккаунт" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <span className="account-trigger-avatar">{avatar}</span>
        <span className="account-trigger-copy"><strong>{account?.email ?? (telegramAccount ? "Telegram account" : loading ? "Loading account" : "Account")}</strong><small>{telegramAccount ? "Telegram connected" : "Personal workspace"}</small></span>
        <ChevronDown className={open ? "account-chevron open" : "account-chevron"} size={14} />
      </button>
      {open && (
        <section className="account-popover" aria-label="Account details">
          <div className="account-popover-heading"><span className="account-trigger-avatar">{avatar}</span><div><strong>{telegramAccount ? "Telegram account" : account?.email ?? "Personal account"}</strong><span>{account ? "Signed in" : loading ? "Checking session…" : "Account details unavailable"}</span></div></div>
          {error && <p className="account-error">{error}</p>}
          <div className="account-detail-list">
            <div className="account-detail"><span>Sign-in method</span><strong>{telegramAccount ? "Telegram" : account?.auth_method === "email" ? "Email and password" : "Loading…"}</strong></div>
            {account?.email && <div className="account-detail"><span>Email</span><strong>{account.email}</strong></div>}
            <div className="account-detail"><span>Telegram</span><strong>{account?.telegram_user_id ? "ID " + account.telegram_user_id : "Not linked"}</strong></div>
            <div className="account-detail"><span>Account created</span><strong>{account?.created_at ? new Date(account.created_at).toLocaleDateString() : "Not available"}</strong></div>
            <div className="account-connection"><CheckCircle2 size={15} /><span>{account?.telegram_user_id ? "Telegram connection active" : "Telegram is not linked to this account"}</span></div>
          </div>
          <div className="account-menu-links">
            <Link href="/settings" onClick={() => setOpen(false)}><Settings2 size={15} />Profile preferences</Link>
            <Link href="/security" onClick={() => setOpen(false)}><ShieldCheck size={15} />Account and security</Link>
            <button type="button" onClick={() => void signOut()} disabled={signingOut}><LogOut size={15} />{signingOut ? "Signing out…" : "Sign out"}</button>
          </div>
        </section>
      )}
    </div>
  );
}
