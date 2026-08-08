"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "../components/AuthShell";
import { Icon } from "../components/Icon";
import { apiFetch } from "../lib/api";

type Step = "credentials" | "two-factor";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submitCredentials(event: React.FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await apiFetch("/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      const body = await response.json().catch(() => null) as { token?: string; requireTwoFactor?: boolean; challengeToken?: string; error?: { message?: string } } | null;
      if (!response.ok) throw new Error(body?.error?.message || "Email or password is incorrect.");
      if (body?.requireTwoFactor && body.challengeToken) { setChallengeToken(body.challengeToken); setStep("two-factor"); return; }
      router.push("/dashboard");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Nodsend could not be reached."); }
    finally { setLoading(false); }
  }

  async function submitTwoFactor(event: React.FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await apiFetch("/v1/auth/login/2fa", { method: "POST", body: JSON.stringify({ challengeToken, code }) });
      const body = await response.json().catch(() => null) as { token?: string; error?: { message?: string } } | null;
      if (!response.ok) throw new Error(body?.error?.message || "That verification code is invalid or expired.");
      router.push("/dashboard");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Verification failed."); }
    finally { setLoading(false); }
  }

  return (
    <AuthShell title={step === "credentials" ? "Welcome back" : "Verify it’s you"} description={step === "credentials" ? "Sign in to your decision control plane." : <>Enter the six-digit code from your authenticator app.</>} footer={step === "credentials" ? <>New to Nodsend? <Link href="/signup">Create a workspace</Link></> : <button className="auth-link-button" type="button" onClick={() => { setStep("credentials"); setCode(""); setError(""); }}>Use another account</button>}>
      {error && <div className="alert-error" role="alert">{error}</div>}
      {step === "credentials" ? <form className="auth-form" onSubmit={submitCredentials}>
        <div><label className="label" htmlFor="email">Work email</label><input id="email" className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" /></div>
        <div><div className="field-heading"><label className="label" htmlFor="password">Password</label><Link href="/forgot-password">Forgot password?</Link></div><input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Your password" /></div>
        <button type="submit" className="btn-primary auth-submit" disabled={loading}>{loading ? "Signing in…" : <>Sign in <Icon name="arrow" size={16} /></>}</button>
      </form> : <form className="auth-form" onSubmit={submitTwoFactor}>
        <div><label className="label" htmlFor="two-factor-code">Authenticator code</label><input id="two-factor-code" className="input auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus aria-describedby="code-help" /><small id="code-help">Codes refresh every 30 seconds.</small></div>
        <button type="submit" className="btn-primary auth-submit" disabled={loading || code.length !== 6}>{loading ? "Verifying…" : <>Verify and continue <Icon name="arrow" size={16} /></>}</button>
      </form>}
    </AuthShell>
  );
}
