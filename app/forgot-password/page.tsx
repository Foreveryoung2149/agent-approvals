"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "../components/AuthShell";
import { Icon } from "../components/Icon";
import { apiFetch } from "../lib/api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "reset" | "done">("request"); const [email, setEmail] = useState(""); const [code, setCode] = useState(""); const [newPassword, setNewPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function request(event: React.FormEvent) { event.preventDefault(); setError(""); setLoading(true); try { const response = await apiFetch("/v1/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }); if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error?.message || "The reset request could not be sent."); } setStep("reset"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Nodsend could not be reached."); } finally { setLoading(false); } }
  async function reset(event: React.FormEvent) { event.preventDefault(); setError(""); setLoading(true); try { const response = await apiFetch("/v1/auth/reset-password", { method: "POST", body: JSON.stringify({ email, code, newPassword }) }); if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error?.message || "The code is invalid or expired."); } setStep("done"); } catch (cause) { setError(cause instanceof Error ? cause.message : "The password could not be updated."); } finally { setLoading(false); } }
  const title = step === "request" ? "Reset your password" : step === "reset" ? "Enter your reset code" : "Password updated";
  const description = step === "request" ? "We’ll send a six-digit code to your verified email." : step === "reset" ? <>The code was sent to <strong>{email}</strong>.</> : "Your previous sessions have been invalidated. You can sign in again safely.";
  return <AuthShell title={title} description={description} footer={<>Remember your password? <Link href="/login">Sign in</Link></>}>
    {error && <div className="alert-error" role="alert">{error}</div>}
    {step === "request" && <form className="auth-form" onSubmit={request}><div><label className="label" htmlFor="reset-email">Work email</label><input id="reset-email" className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" /></div><button className="btn-primary auth-submit" type="submit" disabled={loading}>{loading ? "Sending…" : <>Send reset code <Icon name="arrow" size={16} /></>}</button></form>}
    {step === "reset" && <form className="auth-form" onSubmit={reset}><div><label className="label" htmlFor="reset-code">Reset code</label><input id="reset-code" className="input auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} required /></div><div><label className="label" htmlFor="reset-password">New password</label><input id="reset-password" className="input" type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={e => setNewPassword(e.target.value)} required aria-describedby="new-password-help" /><small id="new-password-help">Use at least 12 characters.</small></div><button className="btn-primary auth-submit" type="submit" disabled={loading || code.length !== 6}>{loading ? "Updating…" : <>Update password <Icon name="arrow" size={16} /></>}</button></form>}
    {step === "done" && <div className="auth-success"><span><Icon name="check" size={24} /></span><p>Your password is secure and ready to use.</p><Link href="/login" className="btn-primary">Return to sign in <Icon name="arrow" size={16} /></Link></div>}
  </AuthShell>;
}
