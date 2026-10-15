"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Freelance Hunter client error:", error);
  }, [error]);

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-eyebrow">APPLICATION ERROR</div>
        <h1>This page could not be loaded</h1>
        <p className="auth-subtitle">The page encountered an unexpected error. Try loading it again. If the problem continues, return to sign in.</p>
        {error.digest && <p className="auth-legal">Error reference: {error.digest}</p>}
        <button className="primary-button auth-submit" onClick={() => reset()}>Try again</button>
        <div className="auth-footer"><Link href="/login">Go to sign in</Link></div>
      </section>
    </main>
  );
}
