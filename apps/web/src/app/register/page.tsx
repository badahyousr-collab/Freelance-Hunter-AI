"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Command, LoaderCircle, Mail, ShieldCheck } from "lucide-react";

const API = "/api/backend";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setVerificationToken("");
    try {
      const response = await fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email, password }) });
      const data = await response.json().catch(() => ({} as { detail?: string; message?: string; verification_token?: string }));
      if (!response.ok) throw new Error(data.detail ?? "Could not create your account");
      setMessage(data.message ?? "Account created. Check your email.");
      if (data.verification_token) setVerificationToken(data.verification_token);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Network error. Is the API running?"); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell"><section className="auth-card"><Link href="/" className="auth-brand"><span className="brand-mark"><Command size={21} /></span><span>Pipisso<small>FREELANCE HUNTER</small></span></Link><div className="auth-eyebrow"><ShieldCheck size={14} /> YOUR NEXT CHAPTER STARTS HERE</div><h1>Create your account</h1><p className="auth-subtitle">Set up your workspace and start finding better freelance opportunities.</p><form onSubmit={submit} className="auth-form"><label>Email address</label><div className="auth-input-wrap"><Mail size={17} /><input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div><label>Password</label><input className="auth-input" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 10 characters" /><button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : null}Create account <ArrowRight size={16} /></button></form>{message && <div className="auth-message" role="status">{message}{verificationToken && <div className="dev-token"><Link href={`/verify-email?token=${encodeURIComponent(verificationToken)}`}>Verify this development account <ArrowRight size={14} /></Link><small>Development only: the verification token is shown because email delivery is not configured.</small></div>}</div>}<div className="auth-footer">Already have an account? <Link href="/login">Sign in</Link></div><p className="auth-legal">By continuing, you agree to use the service responsibly and protect your account credentials.</p></section></main>;
}
