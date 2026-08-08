"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Brand } from "../../../components/Brand";
import { Icon } from "../../../components/Icon";
import { API_URL } from "../../../lib/api";
import styles from "./page.module.css";

type DecisionState = "loading" | "ready" | "submitting" | "done" | "error";
type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";

interface ApprovalDetail {
  id: string;
  agent_name: string;
  action: string;
  summary: string;
  details?: Record<string, unknown> | null;
  status: ApprovalStatus;
  recipient: string;
  expires_at: string;
  created_at: string;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  try { return JSON.stringify(value, null, 2); } catch { return "Structured value"; }
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function ApprovalDecision({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; action: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id, action } = use(params);
  const { t: initialToken } = use(searchParams);
  const [token] = useState(initialToken || "");
  const [decisionMode, setDecisionMode] = useState<"approve" | "reject">(
    action === "reject" ? "reject" : "approve",
  );
  const [state, setState] = useState<DecisionState>("loading");
  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [result, setResult] = useState<"approved" | "rejected" | "">("");
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const isReject = decisionMode === "reject";
  const validAction = action === "approve" || action === "reject";

  useEffect(() => {
    if (!initialToken) return;
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [initialToken]);

  const fetchApproval = useCallback(async (signal?: AbortSignal) => {
    if (!validAction || !token) {
      setError(!validAction ? "This decision link contains an invalid action." : "This decision link is missing its security token.");
      setState("error");
      return;
    }
    setState("loading");
    setError("");
    try {
      const query = new URLSearchParams({ token });
      const response = await fetch(`${API_URL}/v1/decision-requests/${encodeURIComponent(id)}?${query.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal,
      });
      const body = (await response.json().catch(() => null)) as ApprovalDetail | { error?: { message?: string } } | null;
      if (!response.ok) {
        const message = body && "error" in body ? body.error?.message : undefined;
        throw new Error(message || (response.status === 410 ? "This approval has expired." : "This approval could not be loaded."));
      }
      setApproval(body as ApprovalDetail);
      setState("ready");
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
      setError(fetchError instanceof Error ? fetchError.message : "This approval could not be loaded.");
      setState("error");
    }
  }, [id, token, validAction]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchApproval(controller.signal);
    return () => controller.abort();
  }, [fetchApproval]);

  async function decide(approve: boolean) {
    if (!token || state === "submitting") return;
    setState("submitting");
    setError("");
    try {
      const query = new URLSearchParams({ token });
      const response = await fetch(`${API_URL}/v1/decision-requests/${encodeURIComponent(id)}/decision?${query.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          decision: approve ? "approved" : "rejected",
          reason: approve ? undefined : reason.trim() || undefined,
        }),
      });
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(body?.error?.message || "Your decision could not be recorded.");
      setResult(approve ? "approved" : "rejected");
      setState("done");
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Your decision could not be recorded.");
      setState("error");
    }
  }

  function switchDecision(mode: "approve" | "reject") {
    setDecisionMode(mode);
    window.history.replaceState(
      window.history.state,
      "",
      `/a/${encodeURIComponent(id)}/${mode}`,
    );
  }

  if (state === "loading") return <DecisionShell><LoadingCard /></DecisionShell>;
  if (state === "error") return <DecisionShell><ErrorCard message={error} onRetry={approval ? undefined : () => void fetchApproval()} /></DecisionShell>;
  if (state === "done") return <DecisionShell><DoneCard result={result} /></DecisionShell>;

  if (!approval || approval.status !== "pending") {
    return <DecisionShell><SettledCard status={approval?.status || "expired"} /></DecisionShell>;
  }

  const details = Object.entries(approval.details || {});

  return (
    <DecisionShell>
      <article className={styles.card}>
        <header className={styles.header}>
          <span className={styles.eyebrow}><span /> Secure human checkpoint</span>
          <span className={styles.expiry}><Icon name="clock" size={14} /> Expires {formatDateTime(approval.expires_at)}</span>
        </header>

        <section className={styles.summary}>
          <div className={styles.agentIcon}><Icon name="spark" size={23} /></div>
          <div>
            <span>Requested by {approval.agent_name}</span>
            <h1>{approval.summary}</h1>
            <code>{approval.action}</code>
          </div>
        </section>

        {details.length > 0 && (
          <section className={styles.details} aria-labelledby="decision-details-title">
            <div className={styles.sectionHeading}><Icon name="activity" size={17} /><h2 id="decision-details-title">Action details</h2></div>
            <dl>
              {details.map(([key, value]) => (
                <div key={key}><dt>{formatLabel(key)}</dt><dd>{formatValue(value)}</dd></div>
              ))}
            </dl>
          </section>
        )}

        <section className={styles.decision} aria-labelledby="decision-heading">
          <div className={styles.sectionHeading}><Icon name={isReject ? "x" : "approval"} size={17} /><h2 id="decision-heading">{isReject ? "Reject this action" : "Make a decision"}</h2></div>
          {isReject ? (
            <>
              <p>Rejecting stops the agent from taking this action. You can optionally share a reason with the requesting system.</p>
              <label htmlFor="rejection-reason">Reason <span>(optional)</span></label>
              <textarea id="rejection-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={4} placeholder="Explain why this action should not proceed..." />
              <div className={styles.actions}>
                <button type="button" className="btn-secondary" onClick={() => switchDecision("approve")}>Go back</button>
                <button type="button" className={styles.rejectButton} onClick={() => void decide(false)} disabled={state === "submitting"}>{state === "submitting" ? "Recording..." : "Confirm rejection"}</button>
              </div>
            </>
          ) : (
            <>
              <p>Only approve if you recognize this agent and understand the action above. Your choice is final.</p>
              <div className={styles.actions}>
                <button type="button" className={styles.rejectLink} onClick={() => switchDecision("reject")}><Icon name="x" size={17} /> Reject</button>
                <button type="button" className="btn-primary" onClick={() => void decide(true)} disabled={state === "submitting"}><Icon name="check" size={17} />{state === "submitting" ? "Recording..." : "Approve action"}</button>
              </div>
            </>
          )}
        </section>

        <footer className={styles.footer}><Icon name="lock" size={14} /> Signed, single-use decision link</footer>
      </article>
    </DecisionShell>
  );
}

function DecisionShell({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className={styles.page} tabIndex={-1}><div className={styles.brand}><Brand /></div>{children}<p className={styles.trust}><Icon name="shield" size={14} /> Nodsend protects consequential agent actions with human review.</p></main>;
}

function LoadingCard() {
  return <div className={`${styles.stateCard} ${styles.loading}`} role="status"><span /><h1>Verifying approval</h1><p>Checking the signature and current decision state...</p></div>;
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className={styles.stateCard} role="alert"><div className={styles.stateIcon} data-tone="danger"><Icon name="shield" size={25} /></div><h1>We couldn&apos;t open this request</h1><p>{message || "The link may be invalid or expired."}</p>{onRetry ? <button type="button" className="btn-secondary" onClick={onRetry}>Try again</button> : <Link href="/" className="btn-secondary">Go to Nodsend</Link>}</div>;
}

function DoneCard({ result }: { result: "approved" | "rejected" | "" }) {
  const approved = result === "approved";
  return <div className={styles.stateCard} role="status"><div className={styles.stateIcon} data-tone={approved ? "success" : "danger"}><Icon name={approved ? "check" : "x"} size={25} /></div><span className={styles.eyebrow}><span /> Decision recorded</span><h1>{approved ? "Action approved" : "Action rejected"}</h1><p>{approved ? "The requesting agent has been notified and may continue." : "The requesting agent has been told not to continue."}</p><p className={styles.safeClose}>You can safely close this window.</p></div>;
}

function SettledCard({ status }: { status: ApprovalStatus }) {
  return <div className={styles.stateCard}><div className={styles.stateIcon}><Icon name="activity" size={25} /></div><span className={styles.eyebrow}><span /> No action needed</span><h1>Already {status}</h1><p>This request has already reached a final state. The audit trail remains available to the workspace owner.</p></div>;
}
