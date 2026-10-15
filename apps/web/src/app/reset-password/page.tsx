"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Command, LoaderCircle, ShieldCheck } from "lucide-react";

const API = "/api/backend";

function ResetPasswordContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setError("");
    if (!token) { setError("The reset link is missing its token."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const response = await fetch(API + "/auth/password-reset/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Could not reset password");
      setDone(true); setMessage(data.message ?? "Password updated. Sign in with your new password.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Please try again.");
    } finally { setBusy(false); }
  }

  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand"><span className="brand-mark"><Command size={21} /></span><span>Pipisso<small>FREELANCE HUNTER</small></span></Link>
    <div className="auth-eyebrow"><ShieldCheck size={14} /> ACCOUNT SECURITY</div><h1>Choose a new password</h1>
    <p className="auth-subtitle">The reset link can be used once and expires after one hour.</p>
    {!done&&<form onSubmit={submit} className="auth-form"><label>New password</label><input className="auth-input" type="password" autoComplete="new-password" minLength={10} maxLength={256} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters"/><label>Confirm password</label><input className="auth-input" type="password" autoComplete="new-password" minLength={10} maxLength={256} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat the new password"/><button className="primary-button auth-submit" type="submit" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:null}Update password <ArrowRight size={16}/></button></form>}
    {error&&<div className="auth-message error" role="alert">{error}</div>}
    {message&&<div className="auth-message" role="status">{message}</div>}
    <div className="auth-footer"><Link href="/login">{done?"Continue to sign in":"Back to sign in"}</Link></div>
  </section></main>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="auth-shell"><section className="auth-card"><LoaderCircle className="spin" size={24}/><p className="auth-subtitle">Loading password reset…</p></section></main>}><ResetPasswordContent/></Suspense>;
}
