import type { Metadata } from "next";
import Footer from "../components/Footer";
import { Icon, type IconName } from "../components/Icon";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to Nodsend about early access, production architecture, enterprise requirements, or product support.",
};

const conversations: Array<{
  id: string;
  icon: IconName;
  label: string;
  title: string;
  description: string;
  subject: string;
  action: string;
}> = [
  {
    id: "early-access",
    icon: "spark",
    label: "Operate early access",
    title: "Move a real workflow into production.",
    description: "Tell us about the agent, the protected action, and the people who need to approve it. We will help you choose a safe rollout path.",
    subject: "Nodsend Operate early access",
    action: "Request early access",
  },
  {
    id: "enterprise",
    icon: "shield",
    label: "Scale and enterprise",
    title: "Design the approval boundary with your team.",
    description: "Discuss higher decision volume, retention requirements, architecture review, security expectations, and a support model that fits your operation.",
    subject: "Nodsend Scale enquiry",
    action: "Talk to the team",
  },
  {
    id: "support",
    icon: "activity",
    label: "Product support",
    title: "Get an implementation unstuck.",
    description: "Share the request ID, framework, and the behavior you expected. Do not include API keys, decision tokens, passwords, or other secrets.",
    subject: "Nodsend product support",
    action: "Ask for support",
  },
];

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
            <a className="btn-primary" href="mailto:hello@nodsend.com">
              Email hello@nodsend.com <Icon name="mail" size={16} />
            </a>
            <div className="contact-safety">
              <Icon name="lock" size={17} />
              <p><strong>Keep credentials out of email.</strong> We will never ask you to send an API key, password, or live approval token.</p>
            </div>
          </aside>
          <div className="contact-cards">
            {conversations.map((conversation, index) => (
              <article className="contact-card" id={conversation.id} key={conversation.id}>
                <div className="contact-card-index">{String(index + 1).padStart(2, "0")}</div>
                <span className="contact-card-icon"><Icon name={conversation.icon} size={23} /></span>
                <div className="contact-card-copy">
                  <span>{conversation.label}</span>
                  <h2>{conversation.title}</h2>
                  <p>{conversation.description}</p>
                  <a href={"mailto:hello@nodsend.com?subject=" + encodeURIComponent(conversation.subject)}>
                    {conversation.action} <Icon name="arrow" size={14} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
