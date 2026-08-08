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

const rawFrom = process.env.FROM_EMAIL || "noreply@nodsend.com";
const FROM_EMAIL = rawFrom.includes("<") ? rawFrom : `Nodsend <${rawFrom}>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

/**
 * Sends the approval request email with one-click approve/reject links.
 */
export async function sendApprovalEmail({ approval }) {
  const resend = await getResend();
  if (!resend) {
    console.warn("[Nodsend] No RESEND_API_KEY configured. Skipping email send.");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const approveUrl = `${APP_URL}/a/${approval.id}/approve?t=${approval.approvalToken}`;
  const rejectUrl = `${APP_URL}/a/${approval.id}/reject?t=${approval.approvalToken}`;
  const expiresAt = new Date(approval.expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const html = `
  <div style="margin:0;background:#050505;font-family:Arial,Helvetica,sans-serif;color:#e8e8e8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0a0a0a;border:1px solid #232323;border-radius:12px;">
          <tr><td style="padding:32px;">
            <div style="margin-bottom:24px;">
              <div style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;background:#c8e64a;color:#050505;border-radius:7px;font-weight:800;font-size:14px;font-family:monospace;">N</div>
            </div>
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#f0f0f0;">Approval needed</h1>
            <p style="margin:0 0 24px;color:#858585;font-size:14px;line-height:1.5;">
              Your AI agent <strong style="color:#e8e8e8;">${escapeHtml(approval.agentName)}</strong>
              wants to take an action and is waiting for your approval.
            </p>

            <div style="background:#111111;border:1px solid #232323;border-radius:8px;padding:16px;margin:0 0 24px;">
              <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;color:#6a6a6a;letter-spacing:0.05em;">Action</p>
              <p style="margin:0 0 16px;font-size:15px;color:#e8e8e8;font-weight:500;">${escapeHtml(approval.summary)}</p>
              ${approval.details && Object.keys(approval.details).length > 0 ? `
                <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;color:#6a6a6a;letter-spacing:0.05em;">Details</p>
                <pre style="margin:0;font-size:13px;color:#a0a0a0;white-space:pre-wrap;word-break:break-word;">${escapeHtml(JSON.stringify(approval.details, null, 2))}</pre>
              ` : ""}
            </div>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="width:50%;padding-right:6px;">
                  <a href="${approveUrl}" style="display:block;text-align:center;background:#c8e64a;color:#050505;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:700;font-size:15px;">✓ Approve</a>
                </td>
                <td style="width:50%;padding-left:6px;">
                  <a href="${rejectUrl}" style="display:block;text-align:center;background:#111111;border:1px solid #f87171;color:#f87171;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:700;font-size:15px;">✗ Reject</a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#6a6a6a;font-size:12px;line-height:1.5;">
              This request expires on ${expiresAt}. If you don't respond, it will expire automatically.
            </p>
          </td></tr>
        </table>
        <p style="margin:24px 0 0;color:#3a3a3a;font-size:11px;text-align:center;">Powered by Nodsend — nodsend.com</p>
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
      console.error("[Nodsend] Email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("[Nodsend] Email send failed:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a password reset email with a 6-digit code.
 */
export async function sendPasswordResetEmail({ email, code, name }) {
  const resend = await getResend();
  if (!resend) {
    console.warn("[Nodsend] No RESEND_API_KEY configured. Skipping password reset email.");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const html = `
  <div style="margin:0;background:#050505;font-family:Arial,Helvetica,sans-serif;color:#e8e8e8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#0a0a0a;border:1px solid #232323;border-radius:12px;">
          <tr><td style="padding:32px;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background:#c8e64a;color:#050505;border-radius:7px;font-weight:800;font-size:14px;font-family:monospace;">N</div>
            </div>
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#f0f0f0;text-align:center;">Reset your password</h1>
            <p style="margin:0 0 24px;color:#858585;font-size:14px;line-height:1.5;text-align:center;">
              ${name ? `Hi ${escapeHtml(name)}, use` : "Use"} this code to reset your password. It expires in 15 minutes.
            </p>
            <div style="background:#111111;border:1px solid #2e2e2e;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
              <p style="margin:0;font-family:monospace;font-size:32px;font-weight:700;letter-spacing:0.2em;color:#c8e64a;">${code}</p>
            </div>
            <p style="margin:0;color:#6a6a6a;font-size:12px;text-align:center;line-height:1.5;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </td></tr>
        </table>
        <p style="margin:24px 0 0;color:#3a3a3a;font-size:11px;text-align:center;">Nodsend — nodsend.com</p>
      </td></tr>
    </table>
  </div>`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your Nodsend password reset code: ${code}`,
      html,
      text: `Your password reset code is: ${code}\n\nThis code expires in 15 minutes. If you didn't request this, ignore this email.`,
    });

    if (error) {
      console.error("[Nodsend] Password reset email error:", error);
      return { success: false, error: error.message };
    }
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("[Nodsend] Password reset email failed:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends an email verification email with a 6-digit code.
 */
export async function sendVerificationEmail({ email, code, name }) {
  const resend = await getResend();
  if (!resend) {
    console.warn("[Nodsend] No RESEND_API_KEY configured. Skipping verification email.");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const html = `
  <div style="margin:0;background:#050505;font-family:Arial,Helvetica,sans-serif;color:#e8e8e8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#0a0a0a;border:1px solid #232323;border-radius:12px;">
          <tr><td style="padding:32px;">
            <div style="text-align:center;margin-bottom:24px;">
              <div style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background:#c8e64a;color:#050505;border-radius:7px;font-weight:800;font-size:14px;font-family:monospace;">N</div>
            </div>
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#f0f0f0;text-align:center;">Verify your email</h1>
            <p style="margin:0 0 24px;color:#858585;font-size:14px;line-height:1.5;text-align:center;">
              ${name ? `Hi ${escapeHtml(name)}, welcome` : "Welcome"} to Nodsend! Use this code to verify your email address. It expires in 15 minutes.
            </p>
            <div style="background:#111111;border:1px solid #2e2e2e;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
              <p style="margin:0;font-family:monospace;font-size:32px;font-weight:700;letter-spacing:0.2em;color:#c8e64a;">${code}</p>
            </div>
          </td></tr>
        </table>
        <p style="margin:24px 0 0;color:#3a3a3a;font-size:11px;text-align:center;">Nodsend — nodsend.com</p>
      </td></tr>
    </table>
  </div>`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your Nodsend verification code: ${code}`,
      html,
      text: `Your Nodsend verification code is: ${code}\n\nThis code expires in 15 minutes.`,
    });

    if (error) {
      console.error("[Nodsend] Verification email error:", error);
      return { success: false, error: error.message };
    }
    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("[Nodsend] Verification email failed:", err.message);
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