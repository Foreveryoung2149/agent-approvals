"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState, LoadingState, PageHeader, Panel } from "../../components/DashboardUI";
import { ConfirmDialog, ErrorState, SecretNotice } from "../../components/dashboard/DashboardControls";
import type { ApiKeyRecord } from "../../components/dashboard/types";
import { formatShortDate, readApiError } from "../../components/dashboard/types";
import { Icon } from "../../components/Icon";
import { apiFetch } from "../../lib/api";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newKeyName, setNewKeyName] = useState("Default key");
  const [newKeyMode, setNewKeyMode] = useState<"live" | "test">("live");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<ApiKeyRecord | null>(null);
  const [error, setError] = useState("");

  const loadKeys = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/v1/api-keys", { signal });
      if (!response.ok) throw new Error(await readApiError(response, "API keys are unavailable."));
      const body = (await response.json()) as { keys?: ApiKeyRecord[] };
      setKeys(body.keys || []);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "API keys could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadKeys(controller.signal);
    return () => controller.abort();
  }, [loadKeys]);

  async function createKey(event: React.FormEvent) {
    event.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError("");
    setNewKey("");
    try {
      const response = await apiFetch("/v1/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: newKeyName.trim(), mode: newKeyMode }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "The API key could not be created."));
      const body = (await response.json()) as { key: string };
      setNewKey(body.key);
      setNewKeyName("Default key");
      setNewKeyMode("live");
      await loadKeys();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "The API key could not be created.");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey() {
    if (!pendingRevoke) return;
    setRevoking(true);
    setError("");
    try {
      const response = await apiFetch(`/v1/api-keys/${encodeURIComponent(pendingRevoke.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readApiError(response, "The key could not be revoked."));
      setPendingRevoke(null);
      await loadKeys();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "The key could not be revoked.");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Credentials" title="API keys" description="Issue separate credentials for every agent and environment." />

      <Panel title="Create a key" description="The full secret is displayed once. Store it in a secure secret manager.">
        <form className="dash-form-card" onSubmit={createKey}>
          <label className="label" htmlFor="key-name">Key name</label>
          <div className="dash-form-row">
            <input id="key-name" className="input" value={newKeyName} onChange={(event) => setNewKeyName(event.target.value)} maxLength={100} placeholder="e.g. Production booking agent" />
            <label className="sr-only" htmlFor="key-mode">Environment mode</label>
            <select id="key-mode" className="input" value={newKeyMode} onChange={(event) => setNewKeyMode(event.target.value as "live" | "test")}>
              <option value="live">Live</option>
              <option value="test">Test</option>
            </select>
            <button type="submit" className="btn-primary" disabled={creating || !newKeyName.trim()}>
              <Icon name="key" size={16} />{creating ? "Creating…" : "Create key"}
            </button>
          </div>
        </form>
        {newKey && (
          <SecretNotice title="Copy this key now—it will not be shown again." value={newKey}>
            <p>Store it as an environment variable and never commit it to source control.</p>
          </SecretNotice>
        )}
      </Panel>

      <div className="dash-section-gap" />

      <Panel title="Issued credentials" description={`${keys.filter((key) => !key.revoked).length} active key${keys.filter((key) => !key.revoked).length === 1 ? "" : "s"}`}>
        {loading ? (
          <LoadingState label="Loading credentials" />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadKeys()} />
        ) : keys.length === 0 ? (
          <EmptyState icon="key" title="No API keys yet" description="Create a scoped credential to connect your first agent." />
        ) : (
          <div className="dash-table-wrap" role="region" aria-label="Issued API keys" tabIndex={0}>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Prefix</th><th>Mode</th><th>Last used</th><th>Created</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td data-label="Name"><strong className="dash-primary-value">{key.name}</strong></td>
                    <td data-label="Prefix"><code className="dash-code-value">{key.key_prefix}</code></td>
                    <td data-label="Mode"><span className={`badge ${key.revoked ? "badge-expired" : key.mode === "test" ? "badge-pending" : "badge-approved"}`}>{key.revoked ? "Revoked" : key.mode === "test" ? "Test" : "Live"}</span></td>
                    <td data-label="Last used">{formatShortDate(key.last_used_at)}</td>
                    <td data-label="Created">{formatShortDate(key.created_at)}</td>
                    <td data-label="Actions" className="dash-table-action">
                      {!key.revoked && <button type="button" className="dash-danger-link" onClick={() => setPendingRevoke(key)}>Revoke</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(pendingRevoke)}
        title="Revoke this API key?"
        description={`${pendingRevoke?.name || "This key"} will stop working immediately. This cannot be undone.`}
        confirmLabel="Revoke key"
        busy={revoking}
        onCancel={() => setPendingRevoke(null)}
        onConfirm={() => void revokeKey()}
      />
    </div>
  );
}
