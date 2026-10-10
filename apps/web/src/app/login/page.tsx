"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Command, LoaderCircle, Mail } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Could not sign in");
      window.location.assign("/");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Network error. Is the API running?"); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell"><section className="auth-card"><Link href="/" className="auth-brand"><span className="brand-mark"><Command size={21} /></span><span>Freelance<span className="brand-accent">Hunter</span><small>AI WORKSPACE</small></span></Link><div className="auth-eyebrow"><Mail size={14} /> WELCOME BACK</div><h1>Sign in to your workspace</h1><p className="auth-subtitle">Pick up where your freelance search left off.</p><form onSubmit={submit} className="auth-form"><label>Email address</label><div className="auth-input-wrap"><Mail size={17} /><input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div><label>Password</label><input className="auth-input" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" /><button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : null}Sign in <ArrowRight size={16} /></button></form>{message && <div className="auth-message error" role="alert">{message}</div>}<div className="auth-footer">New to Freelance Hunter AI? <Link href="/register">Create account</Link></div><p className="auth-legal">Your session is protected with an HTTP-only cookie.</p></section></main>;
}
