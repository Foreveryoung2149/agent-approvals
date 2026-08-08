import Link from "next/link";
import { Brand } from "./Brand";

const groups = [
  { title: "Product", links: [["How it works", "/#how-it-works"], ["Integrations", "/#integrations"], ["Pricing", "/pricing"]] },
  { title: "Developers", links: [["Documentation", "/docs"], ["API reference", "/docs#quick-start"], ["Webhooks", "/docs#webhooks"]] },
  { title: "Company", links: [["FAQ", "/faq"], ["Blog", "/blog"], ["Security", "/docs#security"]] },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-about">
          <Brand />
          <p>The independent human approval layer for consequential agent actions. One API, every framework, complete auditability.</p>
        </div>
        {groups.map((group) => (
          <div className="footer-col" key={group.title}>
            <h3>{group.title}</h3>
            {group.links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          </div>
        ))}
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Nodsend. Built for accountable autonomy.</span>
        <span className="status-online">All systems operational</span>
      </div>
    </footer>
  );
}
