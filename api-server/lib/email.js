/**
 * Sends an approval request email to the human who needs to decide.
 * Uses Resend for delivery.
 */

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  // Dynamic import so the dependency is optional in dev
  return import("resend").then((m) => new m.Resend(apiKey));
}

const FROM_EMAIL = process.env.FROM_EMAIL || "approvals@agentapprovals.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

/**
 * Sends the approval request email with one-click approve/reject links.
 */
export async function sendApprovalEmail({ approval }) {
  const resend = await getResend();
  if (!resend) {
    console.warn("[Agent Approvals] No RESEND_API_KEY configured. Skipping email send.");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const approveUrl = `${APP_URL}/a/${approval.id}/approve?t=${approval.approvalToken}`;
  const rejectUrl = `${APP_URL}/a/${approval.id}/reject?t=${approval.approvalToken}`;
  const expiresAt = new Date(approval.expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const html = `
  <div style="margin:0;background:#09090b;font-family:Arial,Helvetica,sans-serif;color:#f4f4f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#09090b;border:1px solid #27272a;border-radius:12px;">
          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#fff;">Approval needed</h1>
            <p style="margin:0 0 24px;color:#a1a1aa;font-size:14px;line-height:1.5;">
              Your AI agent <strong style="color:#f4f4f5;">${escapeHtml(approval.agentName)}</strong>
              wants to take an action and is waiting for your approval.
            </p>

            <div style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:16px;margin:0 0 24px;">
              <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;color:#71717a;letter-spacing:0.05em;">Action</p>
              <p style="margin:0 0 16px;font-size:15px;color:#f4f4f5;font-weight:500;">${escapeHtml(approval.summary)}</p>
              ${approval.details && Object.keys(approval.details).length > 0 ? `
                <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;color:#71717a;letter-spacing:0.05em;">Details</p>
                <pre style="margin:0;font-size:13px;color:#a1a1aa;white-space:pre-wrap;word-break:break-word;">${escapeHtml(JSON.stringify(approval.details, null, 2))}</pre>
              ` : ""}
            </div>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="width:50%;padding-right:6px;">
                  <a href="${approveUrl}" style="display:block;text-align:center;background:#3b82f6;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;">Approve</a>
                </td>
                <td style="width:50%;padding-left:6px;">
                  <a href="${rejectUrl}" style="display:block;text-align:center;background:#18181b;border:1px solid #ef4444;color:#ef4444;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;">Reject</a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">
              This request expires on ${expiresAt}. If you don't respond, it will expire automatically.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;

  const text = `Approval needed

Your AI agent "${approval.agentName}" wants to take an action:

${approval.summary}

Approve: ${approveUrl}
Reject: ${rejectUrl}

This request expires on ${expiresAt}.`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: approval.recipient,
      subject: `Approval needed: ${approval.summary}`,
      html,
      text,
    });

    if (error) {
      console.error("[Agent Approvals] Email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("[Agent Approvals] Email send failed:", err.message);
    return { success: false, error: err.message };
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}