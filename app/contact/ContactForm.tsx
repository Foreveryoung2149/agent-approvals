"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "../components/Icon";
import { apiFetch } from "../lib/api";

type FormState =
  | { status: "idle" | "submitting"; message: "" }
  | { status: "success" | "error"; message: string };

const HASH_CATEGORIES: Record<string, string> = {
  "early-access": "product",
  enterprise: "enterprise",
  support: "support",
};

export function ContactForm() {
  const [state, setState] = useState<FormState>({ status: "idle", message: "" });

  useEffect(() => {
    const selected = HASH_CATEGORIES[window.location.hash.slice(1)];
    if (!selected) return;
    const field = document.querySelector<HTMLSelectElement>("#contact-category");
    if (field) field.value = selected;
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setState({ status: "submitting", message: "" });

    try {
      const response = await apiFetch("/v1/contact", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          category: data.get("category"),
          subject: data.get("subject"),
          message: data.get("message"),
          website: data.get("website"),
        }),
      });
      const body = await response.json().catch(() => null) as {
        message?: string;
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        throw new Error(body?.error?.message || "Your message could not be sent. Please try again.");
      }

      form.reset();
      setState({
        status: "success",
        message: body?.message || "Thanks - your message is on its way to the Nodsend team.",
      });
    } catch (cause) {
      setState({
        status: "error",
        message: cause instanceof Error ? cause.message : "Your message could not be sent. Please try again.",
      });
    }
  }

  const submitting = state.status === "submitting";

  return (
    <div className="contact-form-card" aria-labelledby="contact-form-title">
      <div className="contact-form-heading">
        <span className="signal-label">Tell us what you are building</span>
        <h2 id="contact-form-title">Start the conversation.</h2>
        <p>Share enough context for us to route your message. We normally respond within two business days.</p>
      </div>

      <form className="contact-form" onSubmit={submit} aria-busy={submitting}>
        <div className="contact-form-grid">
          <div>
            <label className="label" htmlFor="contact-name">Name</label>
            <input className="input" id="contact-name" name="name" autoComplete="name" minLength={2} maxLength={120} required />
          </div>
          <div>
            <label className="label" htmlFor="contact-email">Work email</label>
            <input className="input" id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} required />
          </div>
          <div className="contact-form-full">
            <label className="label" htmlFor="contact-category">What can we help with?</label>
            <select className="input" id="contact-category" name="category" defaultValue="product" required>
              <option value="product">Product and early access</option>
              <option value="enterprise">Enterprise and security</option>
              <option value="support">Product support</option>
              <option value="partnership">Partnership</option>
              <option value="other">Something else</option>
            </select>
          </div>
          <div className="contact-form-full">
            <label className="label" htmlFor="contact-subject">Subject</label>
            <input className="input" id="contact-subject" name="subject" minLength={3} maxLength={160} required />
          </div>
          <div className="contact-form-full">
            <label className="label" htmlFor="contact-message">How can we help?</label>
            <textarea className="input" id="contact-message" name="message" rows={7} minLength={20} maxLength={5000} aria-describedby="contact-message-help" required />
            <small id="contact-message-help">Include the workflow, protected action, and your rollout stage. Never include credentials or decision tokens.</small>
          </div>
        </div>

        <div className="contact-honeypot" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        {state.status === "error" && <div className="contact-form-status contact-form-error" role="alert">{state.message}</div>}
        {state.status === "success" && <div className="contact-form-status contact-form-success" role="status" aria-live="polite"><Icon name="check" size={17} /> {state.message}</div>}

        <div className="contact-form-footer">
          <p>By sending this form, you agree that we may use your details to respond as described in our <Link href="/privacy">Privacy Policy</Link>.</p>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Sending..." : <>Send message <Icon name="arrow" size={16} /></>}
          </button>
        </div>
      </form>
    </div>
  );
}

export function CopyContactEmail() {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    const email = "hello@nodsend.com";
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const field = document.createElement("textarea");
      field.value = email;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  }

  return (
    <button className="btn-primary contact-copy-email" type="button" onClick={copyEmail} aria-live="polite">
      {copied ? <>Email copied <Icon name="check" size={16} /></> : <>Copy hello@nodsend.com <Icon name="copy" size={16} /></>}
    </button>
  );
}
