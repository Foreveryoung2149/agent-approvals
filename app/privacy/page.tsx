import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Nodsend collects, uses, protects, and retains personal information.",
};

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Scope and our role",
    content: <><p>This Privacy Policy explains how Nodsend handles personal information when you visit our website, create an account, use the dashboard or APIs, receive an approval request, or contact us.</p><p>For account, website, billing, and support information, Nodsend generally acts as a controller. When a customer submits approval content and recipient information, that customer generally acts as controller and Nodsend processes the information on its instructions. Contact the relevant customer first if your request concerns an approval they sent.</p></>,
  },
  {
    id: "information",
    title: "Information we collect",
    content: <><p>We may collect account information such as your name, email address, organisation, authentication settings, and plan; approval information such as recipient details, summaries, context, decisions, timestamps, and audit events; and technical information such as IP address, device and browser data, request identifiers, logs, and security events.</p><p>We also collect information you provide in support or sales conversations and limited billing information from our payment provider. We do not need or store full payment-card details.</p></>,
  },
  {
    id: "use",
    title: "How we use information",
    content: <><p>We use personal information to provide and secure the Service, authenticate users, deliver decision requests, record outcomes, send operational messages, process payments, provide support, investigate abuse, monitor reliability, enforce agreements, comply with law, and improve product performance.</p><p>We do not sell personal information. We do not use approval content to train general-purpose AI models.</p></>,
  },
  {
    id: "legal-bases",
    title: "Legal bases",
    content: <p>Where data-protection law requires a legal basis, we rely on performance of a contract, our legitimate interests in operating and securing the Service, compliance with legal obligations, and consent where required. You may withdraw consent at any time, without affecting processing that occurred before withdrawal.</p>,
  },
  {
    id: "sharing",
    title: "How information is shared",
    content: <><p>We share information only as needed with service providers that support hosting, databases, email delivery, observability, security, customer support, and payments; with professional advisers; during a corporate transaction; when you direct an integration; or when law requires disclosure.</p><p>Providers are permitted to use information only to perform services for us and must protect it under appropriate contractual obligations. We may publish aggregated or de-identified information that cannot reasonably identify an individual.</p></>,
  },
  {
    id: "transfers",
    title: "International transfers",
    content: <p>Nodsend and its providers may process information outside the country where it was collected. Where required, we use recognised safeguards such as adequacy decisions, standard contractual clauses, and supplementary security measures.</p>,
  },
  {
    id: "retention",
    title: "Retention",
    content: <><p>We keep information only as long as needed for the purposes described here, including to provide plan-specific audit history, maintain security records, comply with law, resolve disputes, and enforce agreements. Retention periods vary by data type, plan, and customer configuration.</p><p>When information is no longer needed, we delete or de-identify it, subject to backup cycles and legal holds. Customers may have their own retention obligations for exported decisions and webhook events.</p></>,
  },
  {
    id: "security",
    title: "Security",
    content: <p>We use administrative, technical, and organisational safeguards designed to protect information, including access controls, credential hashing, encryption for sensitive secrets, tenant isolation, signed events, logging, and restricted production access. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.</p>,
  },
  {
    id: "rights",
    title: "Your privacy rights",
    content: <><p>Depending on where you live, you may have rights to access, correct, delete, restrict, object to, or receive a copy of personal information, and to complain to a data-protection authority. You may also opt out of non-essential marketing.</p><p>We may need to verify your identity before completing a request. If Nodsend processes information for a customer, we may refer your request to that customer or help them respond.</p></>,
  },
  {
    id: "cookies",
    title: "Cookies and similar technology",
    content: <p>We use essential cookies and local storage where needed for authentication, security, session continuity, and preferences. If we introduce optional analytics or marketing technologies that require consent, we will provide the required notice and choice before using them.</p>,
  },
  {
    id: "children",
    title: "Children",
    content: <p>The Service is designed for organisations and developers, not children. We do not knowingly collect personal information from children under 16. If you believe a child has provided information, contact us so we can review and delete it where appropriate.</p>,
  },
  {
    id: "changes",
    title: "Changes and contact",
    content: <><p>We may update this Policy as the Service, providers, or law changes. We will revise the date above and provide additional notice when required.</p><p>For privacy questions or rights requests, email <a href="mailto:hello@nodsend.com?subject=Nodsend%20privacy">hello@nodsend.com</a>. If your request concerns an approval sent by one of our customers, include the customer&apos;s name but do not send an approval token or other secret.</p></>,
  },
];

export default function PrivacyPage() {
  return <LegalPage eyebrow="Data handled with purpose" title="Privacy Policy" introduction="How Nodsend uses and protects information while carrying a decision safely from an agent to a person and back." updated="8 August 2026" sections={sections} />;
}
