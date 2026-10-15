"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Command, LoaderCircle, Mail } from "lucide-react";

const API = "/api/backend";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch(API + "/auth/password-reset/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Could not request a password reset");
      setMessage(data.message ?? "If an account exists for that address, a reset link has been sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Please try again.");
    } finally { setBusy(false); }
  }

  return <main className="auth-shell"><section className="auth-card">
    <Link href="/" className="auth-brand"><span className="brand-mark"><Command size={21} /></span><span>Pipisso<small>FREELANCE HUNTER</small></span></Link>
    <div className="auth-eyebrow"><Mail size={14} /> ACCOUNT RECOVERY</div><h1>Reset your password</h1>
    <p className="auth-subtitle">Enter the email address associated with your account. We will send a one-time reset link if the account exists.</p>
    <form onSubmit={submit} className="auth-form"><label>Email address</label><div className="auth-input-wrap"><Mail size={17}/><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div>
      <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:null}Send reset link <ArrowRight size={16}/></button>
    </form>
    {error&&<div className="auth-message error" role="alert">{error}</div>}
    {message&&<div className="auth-message" role="status">{message}</div>}
    <div className="auth-footer"><Link href="/login">Back to sign in</Link></div>
  </section></main>;
}
