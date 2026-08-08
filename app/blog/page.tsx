import type { Metadata } from "next";
import Link from "next/link";
import Footer from "../components/Footer";
import { Icon } from "../components/Icon";
import Navbar from "../components/Navbar";

export const metadata: Metadata = { title: "Field notes", description: "Engineering notes on human authority, agent safety, and durable approval workflows." };

const notes = [
  { tag: "Architecture", title: "Why approval is a control-plane concern", text: "A model asking itself for permission is not the same as an application-enforced decision boundary.", href: "/docs#security", action: "Read the security model" },
  { tag: "Integrations", title: "Durable human input across agent frameworks", text: "LangGraph interrupts, CrewAI feedback providers, and guarded AutoGen tools solve different parts of the same lifecycle.", href: "/docs#langchain", action: "Explore integrations" },
  { tag: "Operations", title: "Exactly once starts with an atomic decision", text: "Concurrent clicks, network retries, and repeated events should never execute a consequential action twice.", href: "/docs#webhooks", action: "See webhook guidance" },
];

export default function BlogPage() {
  return (
    <main className="marketing-shell">
      <Navbar />
      <section id="main-content" className="page-hero" tabIndex={-1}>
        <div className="container"><span className="signal-label">Nodsend field notes</span><h1>Engineering accountable autonomy.</h1><p>Practical patterns for putting human authority into production agent systems.</p></div>
      </section>
      <section className="notes-section"><div className="container notes-grid">{notes.map((note, index) => <Link href={note.href} className="note-card" key={note.title}><div><span>{note.tag}</span><code>0{index + 1}</code></div><h2>{note.title}</h2><p>{note.text}</p><strong>{note.action}<Icon name="arrow" size={14} /></strong></Link>)}</div></section>
      <section className="newsletter-panel"><div className="container"><div><span className="signal-label">Build with us</span><h2>Follow the product as the decision layer evolves.</h2></div><Link href="/signup" className="btn-primary">Create a workspace <Icon name="arrow" size={15} /></Link></div></section>
      <Footer />
    </main>
  );
}
