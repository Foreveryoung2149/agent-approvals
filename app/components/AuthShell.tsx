import Link from "next/link";
import { BrandMark } from "./Brand";
import { Icon } from "./Icon";
import Navbar from "./Navbar";

export function AuthShell({ title, description, children, footer }: { title: string; description: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="auth-page">
      <Navbar />
      <div id="main-content" className="auth-layout" tabIndex={-1}>
        <section className="auth-context" aria-label="Nodsend product assurance">
          <div><span className="signal-label">Secure workspace access</span><h2>Authority stays human.<br />Access stays verified.</h2><p>Manage decision gates, API credentials, and signed outcome delivery from one operational console.</p></div>
          <ul><li><Icon name="shield" size={17} /> Tenant-isolated workspaces</li><li><Icon name="key" size={17} /> Revocable API credentials</li><li><Icon name="activity" size={17} /> Complete decision history</li></ul>
        </section>
        <section className="auth-card">
          <header className="auth-card-header"><BrandMark size={46} /><div><h1>{title}</h1><p>{description}</p></div></header>
          {children}
          {footer && <footer className="auth-card-footer">{footer}</footer>}
        </section>
      </div>
      <p className="auth-legal">By continuing, you agree to use Nodsend for lawful, authorized approval workflows. <Link href="/docs#security">Security model</Link></p>
    </main>
  );
}
