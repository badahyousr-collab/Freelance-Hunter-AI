"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Command, LoaderCircle, Send, Mail, LockKeyhole } from "lucide-react";

const API = "/api/backend";

type Props = { mode: "register" | "login" };

type ApiError = { detail?: unknown; code?: unknown; bot_url?: unknown; expires_in_seconds?: unknown; authenticated?: unknown };

function messageFrom(value: unknown, fallback: string): string {
  if (value && typeof value === "object" && "detail" in value) {
    const detail = (value as ApiError).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
  }
  return fallback;
}

const wait = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));

export default function TelegramAuth({ mode }: Props) {
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [botUrl, setBotUrl] = useState("");
  const [message, setMessage] = useState("");
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function startTelegram() {
    if (busy) return;
    setBusy(true);
    setCode("");
    setBotUrl("");
    setMessage("Создаём одноразовый код...");
    try {
      const started = await fetch(`${API}/auth/telegram/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: "{}"
      });
      const startData = await started.json().catch(() => ({} as ApiError));
      if (!started.ok) throw new Error(messageFrom(startData, "Не удалось подключиться к Telegram. Попробуй ещё раз."));
      const authCode = typeof startData.code === "string" ? startData.code : "";
      const target = typeof startData.bot_url === "string" ? startData.bot_url : "";
      if (!/^\d{9}$/.test(authCode) || !target.startsWith("https://t.me/")) {
        throw new Error("Сервис вернул некорректный код. Попробуй ещё раз.");
      }
      setCode(authCode);
      setBotUrl(target);
      setMessage("Открой бота, нажми Start и отправь команду /link с этим кодом. Код действует 10 минут.");

      const deadline = Date.now() + 10 * 60 * 1000;
      while (Date.now() < deadline) {
        await wait(2000);
        const statusResponse = await fetch(`${API}/auth/telegram/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code: authCode })
        });
        const statusData = await statusResponse.json().catch(() => ({} as ApiError));
        if (!statusResponse.ok) throw new Error(messageFrom(statusData, "Код больше не действует. Создай новый."));
        if (statusData.authenticated === true) {
          window.location.replace("/dashboard");
          return;
        }
      }
      setMessage("Срок действия кода истёк. Нажми кнопку ниже, чтобы создать новый.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось связаться с сервером. Попробуй ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  async function emailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await response.json().catch(() => ({} as ApiError));
      if (!response.ok) throw new Error(messageFrom(data, "Не удалось войти. Проверь email и пароль."));
      window.location.replace("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось связаться с сервером. Попробуй ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link href="/" className="auth-brand">
          <span className="brand-mark"><Command size={21} /></span>
          <span>Pipisso<small>FREELANCE HUNTER</small></span>
        </Link>
        <div className="auth-eyebrow"><Send size={14} /> TELEGRAM AUTHENTICATION</div>
        <h1>{isRegister ? "Создай аккаунт" : "Войди в аккаунт"}</h1>
        <p className="auth-subtitle">
          {isRegister
            ? "Регистрация без email и пароля. Подтверди Telegram, чтобы создать личное пространство."
            : "Войди через Telegram. Код одноразовый и действует 10 минут."}
        </p>

        <div className="telegram-auth-panel">
          <button className="primary-button auth-submit" type="button" onClick={startTelegram} disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}
            {busy ? "Ожидаем подтверждение..." : code ? "Создать новый код" : "Продолжить через Telegram"}
            {!busy && <ArrowRight size={16} />}
          </button>

          {code && (
            <div className="telegram-code-panel">
              <div className="telegram-code-label">ТВОЙ КОД</div>
              <div className="telegram-code" aria-label={`Код ${code}`}>{code}</div>
              <a className="secondary-button telegram-open-bot" href={botUrl} target="_blank" rel="noreferrer">
                <Send size={15} /> Открыть Telegram-бота
              </a>
              <p className="auth-legal telegram-instructions">
                В боте нажми Start, затем отправь <strong>/link {code}</strong>. Не передавай код другим людям.
              </p>
            </div>
          )}
        </div>

        {message && <div className="auth-message" role="status" aria-live="polite">{message}</div>}

        {mode === "login" && (
          <div className="email-fallback">
            <button className="text-link-button" type="button" onClick={() => { setEmailMode(!emailMode); setMessage(""); }}>
              <LockKeyhole size={14} /> {emailMode ? "Скрыть вход по email" : "Войти по email и паролю"}
            </button>
            {emailMode && (
              <form onSubmit={emailLogin} className="auth-form">
                <label htmlFor="legacy-email">Email</label>
                <div className="auth-input-wrap"><Mail size={17} /><input id="legacy-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
                <label htmlFor="legacy-password">Пароль</label>
                <input id="legacy-password" className="auth-input" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Твой пароль" />
                <button className="secondary-button auth-submit" type="submit" disabled={busy}>{busy ? "Входим..." : "Войти по email"} <ArrowRight size={16} /></button>
                <Link className="auth-small-link" href="/forgot-password">Забыли пароль?</Link>
              </form>
            )}
          </div>
        )}

        <div className="auth-footer">
          {isRegister ? <>Уже есть аккаунт? <Link href="/login">Войти</Link></> : <>Впервые здесь? <Link href="/register">Создать аккаунт</Link></>}
        </div>
        <p className="auth-legal">Сессия защищена HTTP-only cookie. Код можно использовать только один раз.</p>
      </section>
    </main>
  );
}
