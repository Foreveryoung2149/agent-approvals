import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "../components/LegalPage";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "The terms governing access to and use of the Nodsend human approval service.",
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement and scope",
    content: <><p>These Terms and Conditions govern your access to and use of Nodsend, including its website, dashboard, APIs, software development kits, decision pages, and related services (the &quot;Service&quot;). By creating an account, using an API key, or otherwise using the Service, you agree to these Terms.</p><p>If you use Nodsend for an organisation, you confirm that you have authority to accept these Terms for that organisation. &quot;You&quot; then means that organisation. The Nodsend contracting entity identified on an applicable order form or invoice is referred to as &quot;Nodsend&quot;, &quot;we&quot;, or &quot;us&quot;.</p></>,
  },
  {
    id: "accounts",
    title: "Eligibility and accounts",
    content: <><p>You must be legally able to enter into a binding contract and must provide accurate account information. You are responsible for activity under your account, for keeping credentials secure, and for promptly notifying us if you suspect unauthorised access.</p><p>API keys, approval tokens, recovery codes, and session credentials are confidential. You must not expose them in client-side code, public repositories, model prompts, support messages, or other places where unauthorised people could access them.</p></>,
  },
  {
    id: "service",
    title: "What the Service does",
    content: <><p>Nodsend creates and records human approval requests for actions proposed by software systems. It can deliver a decision request, record an approve or reject outcome, and notify your application of that outcome.</p><p>Nodsend records authority; it does not execute the protected action for you. Your application remains responsible for verifying outcomes, enforcing idempotency, applying business rules, and deciding whether and how to act.</p></>,
  },
  {
    id: "responsibilities",
    title: "Your responsibilities",
    content: <><p>You are responsible for configuring approval workflows, selecting recipients, providing clear and lawful context, obtaining necessary notices and consents, and ensuring that a decision is reviewed before any consequential action is executed.</p><p>You must not use the Service to facilitate unlawful activity, evade security controls, impersonate another person, send abusive or deceptive messages, infringe rights, distribute malware, probe or disrupt the Service, or process data you are not authorised to use.</p></>,
  },
  {
    id: "decisions",
    title: "Approval decisions",
    content: <><p>A recorded approval is not legal, financial, medical, employment, or professional advice. It also does not guarantee that the underlying action is safe, lawful, accurate, or appropriate. You decide which people are authorised to approve and what evidence they need.</p><p>Decision links may expire, be cancelled, or become unusable after a decision. You must handle pending, approved, rejected, expired, cancelled, duplicate, and delivery-failure states safely in your own workflow.</p></>,
  },
  {
    id: "plans",
    title: "Plans, fees, and taxes",
    content: <><p>Free and paid plans may have request, retention, support, or feature limits described on the pricing page or in an order form. Paid fees are charged as stated at purchase and, unless required by law or stated otherwise, are non-refundable.</p><p>You are responsible for applicable taxes other than taxes on Nodsend&apos;s income. We may change plan pricing prospectively with reasonable notice. Any order form controls if it expressly conflicts with these Terms.</p></>,
  },
  {
    id: "customer-data",
    title: "Customer data",
    content: <><p>You retain your rights in information you submit to the Service, including approval summaries, decision context, recipient details, metadata, and webhook destinations (&quot;Customer Data&quot;). You grant us the limited rights needed to host, process, transmit, protect, and support Customer Data to provide the Service.</p><p>You confirm that you have a lawful basis and all necessary permissions to provide Customer Data. Do not submit special-category, highly sensitive, or regulated data unless your agreement with Nodsend expressly permits it and suitable safeguards are in place.</p></>,
  },
  {
    id: "third-parties",
    title: "Third-party services",
    content: <p>The Service may interoperate with email providers, cloud infrastructure, agent frameworks, payment providers, and other third-party services. Those services are governed by their own terms. We are not responsible for third-party systems outside our control, but we will use reasonable care when selecting and integrating providers that process data for us.</p>,
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    content: <><p>Nodsend and its licensors own the Service, documentation, branding, and related intellectual property, excluding Customer Data and third-party materials. These Terms give you a limited, non-exclusive, non-transferable right to use the Service while your account remains active and compliant.</p><p>If you provide feedback, you allow us to use it without restriction or payment, provided we do not identify you publicly without permission.</p></>,
  },
  {
    id: "security",
    title: "Security and confidentiality",
    content: <><p>Each party will use reasonable measures to protect the other party&apos;s confidential information and use it only for the relationship. Confidential information does not include information that is public through no breach, already lawfully known, independently developed, or lawfully received from another source.</p><p>No system is completely secure. You must use the available security features, rotate exposed credentials, restrict access, and maintain your own backup, monitoring, and incident-response practices.</p></>,
  },
  {
    id: "availability",
    title: "Availability and changes",
    content: <p>We may improve, modify, suspend, or discontinue parts of the Service. We aim to provide advance notice of material changes when reasonably possible, but urgent security, legal, or reliability work may require immediate action. Beta and early-access features may change, be limited, or be withdrawn.</p>,
  },
  {
    id: "termination",
    title: "Suspension and termination",
    content: <><p>You may stop using the Service at any time. We may suspend or terminate access for material breach, security risk, unlawful use, non-payment, or to comply with law. Where appropriate, we will give notice and an opportunity to remedy the issue.</p><p>Terms that by their nature should survive termination will survive, including payment obligations, confidentiality, intellectual property, disclaimers, liability limits, and dispute provisions.</p></>,
  },
  {
    id: "disclaimers",
    title: "Disclaimers and liability",
    content: <><p>To the maximum extent permitted by law, the Service is provided &quot;as is&quot; and &quot;as available&quot;. We disclaim implied warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted or error-free operation.</p><p>Neither party is liable for indirect, incidental, special, exemplary, punitive, or consequential loss, or for lost profits, revenue, goodwill, or data, to the extent such liability can lawfully be limited. Except for liability that cannot be limited by law, each party&apos;s aggregate liability arising from the Service will not exceed the fees paid or payable for the Service during the twelve months before the event giving rise to the claim.</p></>,
  },
  {
    id: "general",
    title: "General terms",
    content: <><p>You may not assign these Terms without our consent, except as part of a merger, reorganisation, or sale of substantially all relevant assets. We may assign them as part of a corporate reorganisation or transfer of the Service. Neither party is liable for delay caused by events beyond reasonable control.</p><p>The governing law and forum stated in an order form will apply. If no order form applies, the laws of England and Wales govern these Terms, and the courts of England and Wales have exclusive jurisdiction, except where mandatory law requires otherwise.</p></>,
  },
  {
    id: "changes",
    title: "Changes and contact",
    content: <><p>We may update these Terms to reflect changes to the Service, law, or risk. We will update the date above and provide additional notice when a change materially affects your rights. Continued use after the effective date means you accept the revised Terms.</p><p>Questions about these Terms can be sent to <a href="mailto:hello@nodsend.com?subject=Nodsend%20Terms">hello@nodsend.com</a>.</p></>,
  },
];

export default function TermsPage() {
  return <LegalPage eyebrow="The operating agreement" title="Terms and Conditions" introduction="The rules that keep responsibilities clear when Nodsend sits between an agent's intent and a human decision." updated="8 August 2026" sections={sections} />;
}
