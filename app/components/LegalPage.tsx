import type { ReactNode } from "react";
import Link from "next/link";
import Footer from "./Footer";
import Navbar from "./Navbar";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  introduction,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <main className="marketing-shell">
      <Navbar />
      <section id="main-content" className="page-hero page-hero-compact legal-hero" tabIndex={-1}>
        <div className="container">
          <span className="signal-label">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{introduction}</p>
        </div>
      </section>
      <section className="legal-section">
        <div className="container legal-layout">
          <aside className="legal-aside">
            <span className="legal-updated">Last updated</span>
            <strong>{updated}</strong>
            <nav aria-label={title + " sections"}>
              {sections.map((section, index) => (
                <a href={"#" + section.id} key={section.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>
          <article className="legal-document">
            {sections.map((section, index) => (
              <section id={section.id} key={section.id}>
                <span className="legal-index">{String(index + 1).padStart(2, "0")}</span>
                <h2>{section.title}</h2>
                <div>{section.content}</div>
              </section>
            ))}
            <div className="legal-contact">
              <span className="signal-label">Questions about this document?</span>
              <p>Contact us and we will route your request to the right person.</p>
              <Link href="/contact" className="btn-secondary">Contact Nodsend</Link>
            </div>
          </article>
        </div>
      </section>
      <Footer />
    </main>
  );
}
