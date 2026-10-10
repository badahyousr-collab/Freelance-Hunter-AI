"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Command, LoaderCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email address…");

  useEffect(() => {
    if (!token) { setState("error"); setMessage("The verification link is missing its token."); return; }
    let cancelled = false;
    fetch(`${API}/auth/verify-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.detail ?? "Verification failed"); return data; })
      .then(data => { if (!cancelled) { setState("success"); setMessage(data.message ?? "Email verified."); } })
      .catch(error => { if (!cancelled) { setState("error"); setMessage(error instanceof Error ? error.message : "Could not verify this link."); } });
    return () => { cancelled = true; };
  }, [token]);

  const Icon = state === "success" ? CheckCircle2 : state === "error" ? CircleAlert : LoaderCircle;
  return <main className="auth-shell"><section className="auth-card verify-card"><Link href="/" className="auth-brand"><span className="brand-mark"><Command size={21} /></span><span>Freelance<span className="brand-accent">Hunter</span><small>AI WORKSPACE</small></span></Link><div className={`verify-icon ${state}`}><Icon size={28} /></div><h1>{state === "success" ? "Email verified" : state === "error" ? "Verification failed" : "Verifying your email"}</h1><p className="auth-subtitle">{message}</p>{state === "success" && <Link className="primary-button auth-submit button-link" href="/login">Continue to sign in</Link>}{state === "error" && <Link className="secondary-button button-link" href="/register">Back to registration</Link>}</section></main>;
}
