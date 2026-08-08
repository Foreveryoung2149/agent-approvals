"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState, LoadingState, PageHeader, Panel } from "../../components/DashboardUI";
import { ConfirmDialog, ErrorState, SecretNotice } from "../../components/dashboard/DashboardControls";
import type { WebhookDelivery, WebhookRecord } from "../../components/dashboard/types";
import { formatDateTime, readApiError } from "../../components/dashboard/types";
import { Icon } from "../../components/Icon";
import { apiFetch } from "../../lib/api";

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [pendingDelete, setPendingDelete] = useState<WebhookRecord | null>(null);
  const [deliveryWebhook, setDeliveryWebhook] = useState<WebhookRecord | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  const loadWebhooks = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/v1/webhooks", { signal });
      if (!response.ok) throw new Error(await readApiError(response, "Webhook endpoints are unavailable."));
      const body = (await response.json()) as { webhooks?: WebhookRecord[] };
      setWebhooks(body.webhooks || []);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "Webhook endpoints could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadWebhooks(controller.signal);
    return () => controller.abort();
  }, [loadWebhooks]);

  async function createWebhook(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim()) return;
    setCreating(true);
    setError("");
    setNotice("");
    setNewSecret("");
    try {
      const response = await apiFetch("/v1/webhooks", { method: "POST", body: JSON.stringify({ url: url.trim() }) });
      if (!response.ok) throw new Error(await readApiError(response, "The endpoint could not be created."));
      const body = (await response.json()) as { secret?: string; webhook?: { secret?: string } };
      setNewSecret(body.secret || body.webhook?.secret || "");
      setUrl("");
      await loadWebhooks();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "The endpoint could not be created.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteWebhook() {
    if (!pendingDelete) return;
    setWorkingId(pendingDelete.id);
    setError("");
    try {
      const response = await apiFetch(`/v1/webhooks/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readApiError(response, "The endpoint could not be deleted."));
      setPendingDelete(null);
      if (deliveryWebhook?.id === pendingDelete.id) setDeliveryWebhook(null);
      await loadWebhooks();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "The endpoint could not be deleted.");
    } finally {
      setWorkingId("");
    }
  }

  async function testWebhook(webhook: WebhookRecord) {
    setWorkingId(webhook.id);
    setError("");
    setNotice("");
    try {
      const response = await apiFetch(`/v1/webhooks/${encodeURIComponent(webhook.id)}/test`, { method: "POST" });
      if (!response.ok) throw new Error(await readApiError(response, "The test delivery could not be sent."));
      const body = (await response.json()) as { status?: string; status_code?: number; error?: string };
      if (body.status !== "delivered") throw new Error(body.error || `Endpoint returned ${body.status_code || "an error"}.`);
      setNotice(`Test event delivered to ${webhook.url}.`);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "The test delivery failed.");
    } finally {
      setWorkingId("");
    }
  }

  async function rotateSecret(webhook: WebhookRecord) {
    setWorkingId(webhook.id);
    setError("");
    setNotice("");
    setNewSecret("");
    try {
      const response = await apiFetch(`/v1/webhooks/${encodeURIComponent(webhook.id)}/rotate-secret`, { method: "POST" });
      if (!response.ok) throw new Error(await readApiError(response, "The signing secret could not be rotated."));
      const body = (await response.json()) as { secret?: string };
      setNewSecret(body.secret || "");
      setNotice(`Signing secret rotated for ${webhook.url}.`);
    } catch (rotateError) {
      setError(rotateError instanceof Error ? rotateError.message : "The signing secret could not be rotated.");
    } finally {
      setWorkingId("");
    }
  }

  async function loadDeliveries(webhook: WebhookRecord) {
    setDeliveryWebhook(webhook);
    setDeliveries([]);
    setDeliveriesLoading(true);
    setError("");
    try {
      const response = await apiFetch(`/v1/webhooks/${encodeURIComponent(webhook.id)}/deliveries`);
      if (!response.ok) throw new Error(await readApiError(response, "Delivery history is unavailable."));
      const body = (await response.json()) as { deliveries?: WebhookDelivery[] };
      setDeliveries(body.deliveries || []);
    } catch (deliveryError) {
      setError(deliveryError instanceof Error ? deliveryError.message : "Delivery history could not be loaded.");
    } finally {
      setDeliveriesLoading(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Outcome delivery" title="Webhooks" description="Send signed decisions back to your agent and inspect delivery health." />

      {notice && <div className="alert-success" role="status">{notice}</div>}
      {error && !loading && <div className="alert-error" role="alert">{error}</div>}
      {newSecret && <SecretNotice title="Save this signing secret now." value={newSecret}><p>Use it to verify every Nodsend webhook signature.</p></SecretNotice>}

      <Panel title="Add an endpoint" description="HTTPS is required in production. Approval outcome events are enabled by default.">
        <form className="dash-form-card" onSubmit={createWebhook}>
          <label className="label" htmlFor="webhook-url">Endpoint URL</label>
          <div className="dash-form-row">
            <input id="webhook-url" type="url" className="input" value={url} onChange={(event) => setUrl(event.target.value)} required placeholder="https://api.example.com/webhooks/nodsend" />
            <button type="submit" className="btn-primary" disabled={creating || !url.trim()}><Icon name="webhook" size={16} />{creating ? "Adding…" : "Add endpoint"}</button>
          </div>
        </form>
      </Panel>

      <div className="dash-section-gap" />

      <Panel title="Connected endpoints" description={`${webhooks.filter((webhook) => webhook.active).length} active endpoint${webhooks.filter((webhook) => webhook.active).length === 1 ? "" : "s"}`}>
        {loading ? <LoadingState label="Loading endpoints" /> : error && webhooks.length === 0 ? <ErrorState message={error} onRetry={() => void loadWebhooks()} /> : webhooks.length === 0 ? (
          <EmptyState icon="webhook" title="No webhooks connected" description="Add an endpoint to receive signed approval outcomes in real time." />
        ) : (
          <div className="webhook-list">
            {webhooks.map((webhook) => (
              <article key={webhook.id} className="webhook-card">
                <div className="webhook-card-icon"><Icon name="webhook" size={18} /></div>
                <div className="webhook-card-content">
                  <code>{webhook.url}</code>
                  <div className="webhook-events">{webhook.events.map((event) => <span key={event}>{event}</span>)}</div>
                </div>
                <span className={`badge ${webhook.active ? "badge-approved" : "badge-expired"}`}>{webhook.active ? "Active" : "Inactive"}</span>
                <div className="webhook-actions">
                  <button type="button" onClick={() => void testWebhook(webhook)} disabled={workingId === webhook.id}>Test</button>
                  <button type="button" onClick={() => void loadDeliveries(webhook)}>Deliveries</button>
                  <button type="button" onClick={() => void rotateSecret(webhook)} disabled={workingId === webhook.id}>Rotate secret</button>
                  <button type="button" className="dash-danger-link" onClick={() => setPendingDelete(webhook)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      {deliveryWebhook && (
        <>
          <div className="dash-section-gap" />
          <Panel title="Recent deliveries" description={deliveryWebhook.url} action={<button type="button" className="dash-panel-close" onClick={() => setDeliveryWebhook(null)}><Icon name="x" size={15} />Close</button>}>
            {deliveriesLoading ? <LoadingState label="Loading delivery history" /> : deliveries.length === 0 ? <EmptyState icon="activity" title="No delivery attempts yet" description="Send a test event or wait for an approval outcome." /> : (
              <div className="dash-table-wrap" role="region" aria-label="Webhook delivery history" tabIndex={0}>
                <table className="data-table"><thead><tr><th>Event</th><th>Status</th><th>Response</th><th>Attempted</th></tr></thead><tbody>
                  {deliveries.map((delivery) => <tr key={delivery.id}>
                    <td data-label="Event"><code className="dash-code-value">{delivery.event_type}</code></td>
                    <td data-label="Status"><span className={`badge ${delivery.status === "delivered" ? "badge-approved" : delivery.status === "failed" ? "badge-rejected" : "badge-pending"}`}>{delivery.status}</span></td>
                    <td data-label="Response">{delivery.status_code || delivery.error || "Pending"}</td>
                    <td data-label="Attempted">{formatDateTime(delivery.last_attempt_at || delivery.created_at)}</td>
                  </tr>)}
                </tbody></table>
              </div>
            )}
          </Panel>
        </>
      )}

      <ConfirmDialog open={Boolean(pendingDelete)} title="Delete this webhook?" description={`${pendingDelete?.url || "This endpoint"} will stop receiving approval outcomes immediately.`} confirmLabel="Delete endpoint" busy={Boolean(workingId)} onCancel={() => setPendingDelete(null)} onConfirm={() => void deleteWebhook()} />
    </div>
  );
}
