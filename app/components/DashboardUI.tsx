import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="dash-page-header">
      <div>
        {eyebrow && <span className="dash-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="dash-page-actions">{actions}</div>}
    </header>
  );
}

export function MetricCard({ label, value, note, icon, tone = "neutral" }: { label: string; value: ReactNode; note?: string; icon: IconName; tone?: "neutral" | "success" | "warning" | "danger" }) {
  return (
    <article className="metric-card" data-tone={tone}>
      <div className="metric-icon"><Icon name={icon} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}

export function Panel({ title, description, action, children, className = "" }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`dash-panel ${className}`}>
      {(title || action) && (
        <header className="dash-panel-header">
          <div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>
          {action}
        </header>
      )}
      <div className="dash-panel-body">{children}</div>
    </section>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: IconName; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span><Icon name={icon} size={22} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading workspace" }: { label?: string }) {
  return <div className="loading-state"><span /><p>{label}</p></div>;
}
