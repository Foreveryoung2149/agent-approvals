import type { Metadata } from "next";
import Footer from "../components/Footer";
import { Icon } from "../components/Icon";
import Navbar from "../components/Navbar";
import { ContactForm, CopyContactEmail } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to Nodsend about early access, production architecture, enterprise requirements, or product support.",
};

export default function ContactPage() {
  return (
    <main className="marketing-shell">
      <Navbar />
      <section id="main-content" className="page-hero contact-hero" tabIndex={-1}>
        <div className="container">
          <span className="signal-label">Open a direct line</span>
          <h1>Tell us where human judgment belongs.</h1>
          <p>Whether you are testing one guarded tool or designing an enterprise control plane, start with the workflow and the consequence you need to protect.</p>
        </div>
      </section>
      <section className="contact-section">
        <div className="container contact-layout">
          <aside className="contact-intro">
            <span className="signal-label">One inbox, the right path</span>
            <h2>Bring the context.<br />We will help shape the checkpoint.</h2>
            <p>Include what the agent wants to do, who should decide, and what your application must do after the decision.</p>
            <CopyContactEmail />
            <div className="contact-safety">
              <Icon name="lock" size={17} />
              <p><strong>Keep credentials out of messages.</strong> We will never ask you to send an API key, password, or live approval token.</p>
            </div>
          </aside>
          <div className="contact-form-slot">
            <span className="contact-anchor" id="early-access" aria-hidden="true" />
            <span className="contact-anchor" id="enterprise" aria-hidden="true" />
            <span className="contact-anchor" id="support" aria-hidden="true" />
            <ContactForm />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
