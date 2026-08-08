"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "../components/AuthShell";
import { Icon } from "../components/Icon";
import { apiFetch } from "../lib/api";

export default function SignupPage() {
  const [step, setStep] = useState<"account" | "verify">("account");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [code, setCode] = useState("");
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [loading, setLoading] = useState(false); const router = useRouter();

  async function signup(event: React.FormEvent) { event.preventDefault(); setError(""); setLoading(true); try { const response = await apiFetch("/v1/auth/signup", { method: "POST", body: JSON.stringify({ email, password, name: name || undefined }) }); const body = await response.json().catch(() => null) as { requireVerification?: boolean; error?: { message?: string } } | null; if (!response.ok) throw new Error(body?.error?.message || "The account could not be created."); if (body?.requireVerification) setStep("verify"); else router.push("/dashboard"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Nodsend could not be reached."); } finally { setLoading(false); } }
  async function verify(event: React.FormEvent) { event.preventDefault(); setError(""); setLoading(true); try { const response = await apiFetch("/v1/auth/verify-email", { method: "POST", body: JSON.stringify({ email, code }) }); const body = await response.json().catch(() => null) as { error?: { message?: string } } | null; if (!response.ok) throw new Error(body?.error?.message || "That verification code is invalid or expired."); router.push("/dashboard"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Verification failed."); } finally { setLoading(false); } }
  async function resend() { setError(""); setNotice(""); try { await apiFetch("/v1/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) }); setNotice("A new verification code has been sent."); } catch { setError("A new code could not be sent."); } }

  return <AuthShell title={step === "account" ? "Create your workspace" : "Verify your email"} description={step === "account" ? "Start with 100 approval requests each month." : <>We sent a six-digit code to <strong>{email}</strong>.</>} footer={step === "account" ? <>Already have a workspace? <Link href="/login">Sign in</Link></> : <button className="auth-link-button" type="button" onClick={resend}>Send another code</button>}>
    {error && <div className="alert-error" role="alert">{error}</div>}{notice && <div className="alert-success" role="status">{notice}</div>}
    {step === "account" ? <form className="auth-form" onSubmit={signup}><div><label className="label" htmlFor="name">Name <span>(optional)</span></label><input id="name" className="input" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></div><div><label className="label" htmlFor="email">Work email</label><input id="email" className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" /></div><div><label className="label" htmlFor="new-password">Password</label><input id="new-password" className="input" type="password" autoComplete="new-password" minLength={12} value={password} onChange={e => setPassword(e.target.value)} required aria-describedby="password-help" /><small id="password-help">Use at least 12 characters.</small></div><button type="submit" className="btn-primary auth-submit" disabled={loading}>{loading ? "Creating workspace…" : <>Continue <Icon name="arrow" size={16} /></>}</button></form> : <form className="auth-form" onSubmit={verify}><div><label className="label" htmlFor="verification-code">Verification code</label><input id="verification-code" className="input auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus /></div><button type="submit" className="btn-primary auth-submit" disabled={loading || code.length !== 6}>{loading ? "Verifying…" : <>Verify email <Icon name="arrow" size={16} /></>}</button></form>}
  </AuthShell>;
}
