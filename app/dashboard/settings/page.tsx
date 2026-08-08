"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingState, PageHeader, Panel } from "../../components/DashboardUI";
import { CopyButton, ErrorState, useAccessibleModal } from "../../components/dashboard/DashboardControls";
import type { DashboardUser } from "../../components/dashboard/types";
import { readApiError } from "../../components/dashboard/types";
import { Icon } from "../../components/Icon";
import { apiFetch } from "../../lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [show2faModal, setShow2faModal] = useState(false);
  const [tfSecret, setTfSecret] = useState("");
  const [tfUri, setTfUri] = useState("");
  const [tfCode, setTfCode] = useState("");
  const [tfError, setTfError] = useState("");
  const [tfLoading, setTfLoading] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const closeTwoFactorSetup = () => {
    if (!tfLoading) setShow2faModal(false);
  };
  const { backdropRef: twoFactorBackdropRef, dialogRef: twoFactorDialogRef } = useAccessibleModal<HTMLElement>({
    open: show2faModal,
    onClose: closeTwoFactorSetup,
    initialFocusRef: codeRef,
    closeOnEscape: !tfLoading,
  });

  const fetchUser = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/v1/auth/me", { signal });
      if (!response.ok) throw new Error(await readApiError(response, "Account settings are unavailable."));
      const body = (await response.json()) as { user?: DashboardUser };
      if (!body.user) throw new Error("Account details were not returned.");
      setUser(body.user);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "Account settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchUser(controller.signal);
    return () => controller.abort();
  }, [fetchUser]);

  async function start2faSetup() {
    setShow2faModal(true);
    setTfError("");
    setTfCode("");
    setTfSecret("");
    setTfUri("");
    try {
      const response = await apiFetch("/v1/auth/2fa/generate", { method: "POST" });
      if (!response.ok) throw new Error(await readApiError(response, "A setup key could not be generated."));
      const body = (await response.json()) as { secret?: string; uri?: string };
      if (!body.secret || !body.uri) throw new Error("The setup key was incomplete.");
      setTfSecret(body.secret);
      setTfUri(body.uri);
      window.setTimeout(() => codeRef.current?.focus(), 0);
    } catch (setupError) {
      setTfError(setupError instanceof Error ? setupError.message : "Two-factor setup could not start.");
    }
  }

  async function confirm2fa(event: React.FormEvent) {
    event.preventDefault();
    setTfError("");
    setTfLoading(true);
    try {
      const response = await apiFetch("/v1/auth/2fa/enable", {
        method: "POST",
        body: JSON.stringify({ code: tfCode, secret: tfSecret }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "The verification code was not accepted."));
      const body = (await response.json()) as { ok?: boolean };
      if (!body.ok) throw new Error("Two-factor authentication could not be confirmed.");
      setShow2faModal(false);
      setMessage("Two-factor authentication is now enabled.");
      await fetchUser();
    } catch (confirmError) {
      setTfError(confirmError instanceof Error ? confirmError.message : "The verification code was not accepted.");
    } finally {
      setTfLoading(false);
    }
  }

  if (loading) return <LoadingState label="Loading security settings" />;
  if (error || !user) return <ErrorState message={error || "Account details are unavailable."} onRetry={() => void fetchUser()} />;

  return (
    <div>
      <PageHeader eyebrow="Workspace controls" title="Settings" description="Manage identity, account security, and plan information." />
      {message && <div className="alert-success" role="status">{message}</div>}

      <div className="settings-grid">
        <Panel title="Identity" description="The account currently controlling this workspace.">
          <dl className="settings-list">
            <div><dt>Name</dt><dd>{user.name || "Not provided"}</dd></div>
            <div><dt>Email</dt><dd className="dash-break-value">{user.email}</dd></div>
            <div><dt>Verification</dt><dd><span className={`badge ${user.email_verified ? "badge-approved" : "badge-pending"}`}>{user.email_verified ? "Verified" : "Pending"}</span></dd></div>
          </dl>
        </Panel>

        <Panel title="Security" description="Add an independent factor to protect sensitive agent actions.">
          <div className="settings-action-row">
            <span className="settings-action-icon"><Icon name="lock" size={19} /></span>
            <div><strong>Two-factor authentication</strong><p>Require a six-digit authenticator code when signing in.</p></div>
            {user.twoFactorEnabled ? <span className="badge badge-approved">Enabled</span> : <button type="button" className="btn-secondary" onClick={() => void start2faSetup()}>Enable 2FA</button>}
          </div>
        </Panel>

        <Panel title="Plan" description="Current workspace limits and account tier.">
          <div className="settings-action-row">
            <span className="settings-action-icon"><Icon name="bolt" size={19} /></span>
            <div><strong className="dash-capitalize">{user.plan || "Free"} plan</strong><p>100 approvals per month are included on the free plan.</p></div>
            <Link href="/pricing" className="dash-text-link">View plans <Icon name="arrow" size={14} /></Link>
          </div>
        </Panel>
      </div>

      {show2faModal && (
        <div ref={twoFactorBackdropRef} className="dash-dialog-backdrop" role="presentation" onMouseDown={closeTwoFactorSetup}>
          <section ref={twoFactorDialogRef} className="dash-dialog dash-dialog-wide" role="dialog" aria-modal="true" aria-labelledby="two-factor-title" aria-describedby="two-factor-description" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="dash-dialog-close" onClick={closeTwoFactorSetup} aria-label="Close two-factor setup" disabled={tfLoading}><Icon name="x" /></button>
            <div className="dash-dialog-icon"><Icon name="lock" size={20} /></div>
            <h2 id="two-factor-title">Protect your workspace</h2>
            <p id="two-factor-description">Add Nodsend manually in your authenticator app. Your secret never leaves this browser for third-party QR generation.</p>
            {tfError && <div className="alert-error" role="alert">{tfError}</div>}
            {!tfSecret ? <LoadingState label="Generating setup key" /> : (
              <form onSubmit={confirm2fa} className="two-factor-form">
                <div className="manual-secret">
                  <span>Manual setup key</span>
                  <code>{tfSecret}</code>
                  <CopyButton value={tfSecret} label="Copy key" />
                </div>
                <details className="two-factor-uri"><summary>Advanced: copy authenticator URI</summary><code>{tfUri}</code><CopyButton value={tfUri} label="Copy URI" /></details>
                <div>
                  <label className="label" htmlFor="two-factor-code">Verification code</label>
                  <input ref={codeRef} id="two-factor-code" className="input" value={tfCode} onChange={(event) => setTfCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" required />
                </div>
                <div className="dash-dialog-actions">
                  <button type="button" className="btn-secondary" onClick={closeTwoFactorSetup} disabled={tfLoading}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={tfLoading || tfCode.length !== 6}>{tfLoading ? "Verifying…" : "Enable 2FA"}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
