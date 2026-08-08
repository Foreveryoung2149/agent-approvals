"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Icon } from "../Icon";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isolateModalBackground(modalRoot: HTMLElement) {
  const changed: Array<{ element: HTMLElement; inert: boolean; ariaHidden: string | null }> = [];
  let current: HTMLElement = modalRoot;

  while (current.parentElement) {
    const parent = current.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (!(sibling instanceof HTMLElement) || sibling === current) continue;
      changed.push({
        element: sibling,
        inert: sibling.inert,
        ariaHidden: sibling.getAttribute("aria-hidden"),
      });
      sibling.inert = true;
      sibling.setAttribute("aria-hidden", "true");
    }
    if (parent === document.body) break;
    current = parent;
  }

  return () => {
    for (const { element, inert, ariaHidden } of changed) {
      element.inert = inert;
      if (ariaHidden === null) element.removeAttribute("aria-hidden");
      else element.setAttribute("aria-hidden", ariaHidden);
    }
  };
}

export function useAccessibleModal<T extends HTMLElement = HTMLDivElement>({
  open,
  onClose,
  initialFocusRef,
  closeOnEscape = true,
}: {
  open: boolean;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<T>(null);
  const closeRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  closeRef.current = onClose;
  closeOnEscapeRef.current = closeOnEscape;

  useEffect(() => {
    if (!open || !backdropRef.current || !dialogRef.current) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restoreBackground = isolateModalBackground(backdropRef.current);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusDialog = window.requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
      (initialFocusRef?.current || firstFocusable || dialogRef.current)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscapeRef.current) {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => element.getClientRects().length > 0 && element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusDialog);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreBackground();
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [initialFocusRef, open]);

  return { backdropRef, dialogRef };
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  return <span className={`badge badge-${normalized}`}>{normalized}</span>;
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      className="dash-icon-button"
      onClick={copy}
      aria-label={copied ? "Copied to clipboard" : `${label}: ${value}`}
      title={copied ? "Copied" : label}
    >
      <Icon name={copied ? "check" : "copy"} size={16} />
    </button>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="dash-error-state" role="alert">
      <span className="dash-state-icon"><Icon name="shield" /></span>
      <div>
        <strong>We couldn&apos;t load this view</strong>
        <p>{message}</p>
      </div>
      {onRetry && <button type="button" className="btn-secondary" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { backdropRef, dialogRef } = useAccessibleModal({
    open,
    onClose: onCancel,
    initialFocusRef: cancelRef,
    closeOnEscape: !busy,
  });

  if (!open) return null;

  return (
    <div ref={backdropRef} className="dash-dialog-backdrop" role="presentation" onMouseDown={() => !busy && onCancel()}>
      <div
        ref={dialogRef}
        className="dash-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dash-dialog-icon" data-tone="danger"><Icon name="shield" size={20} /></div>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-description">{description}</p>
        <div className="dash-dialog-actions">
          <button ref={cancelRef} type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SecretNotice({ title, value, children }: { title: string; value: string; children?: ReactNode }) {
  return (
    <div className="secret-notice" role="status">
      <div className="secret-notice-heading">
        <div><strong>{title}</strong>{children}</div>
        <CopyButton value={value} label="Copy" />
      </div>
      <code>{value}</code>
    </div>
  );
}
