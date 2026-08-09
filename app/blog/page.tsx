import type { Metadata } from "next";
import Link from "next/link";
import Footer from "../components/Footer";
import { Icon } from "../components/Icon";
import Navbar from "../components/Navbar";
import { blogPosts } from "./posts";

export const metadata: Metadata = {
  title: "Field notes",
  description:
    "Engineering notes on human authority, agent safety, and durable approval workflows.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Nodsend field notes",
    description:
      "Practical engineering patterns for accountable, production-grade agent systems.",
    url: "/blog",
    type: "website",
  },
};

function formatPublishedDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function BlogPage() {
  return (
    <main className="marketing-shell">
      <Navbar />
      <section id="main-content" className="page-hero" tabIndex={-1}>
        <div className="container"><span className="signal-label">Nodsend field notes</span><h1>Engineering accountable autonomy.</h1><p>Practical patterns for putting human authority into production agent systems.</p></div>
      </section>
      <section className="notes-section" aria-labelledby="field-notes-heading">
        <div className="container">
          <h2 id="field-notes-heading" className="sr-only">Latest field notes</h2>
          <div className="notes-grid">
            {blogPosts.map((post) => (
              <article className="note-card-shell" key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="note-card"
                  aria-label={`Read ${post.title}`}
                >
                  <div className="note-card-kicker">
                    <span>{post.tag}</span>
                    <code>{post.sequence}</code>
                  </div>
                  <h2>{post.title}</h2>
                  <p>{post.description}</p>
                  <div className="note-card-meta">
                    <time dateTime={post.publishedAt}>{formatPublishedDate(post.publishedAt)}</time>
                    <span aria-hidden="true">/</span>
                    <span>{post.readingTime}</span>
                  </div>
                  <strong>Read article <Icon name="arrow" size={14} /></strong>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="newsletter-panel"><div className="container"><div><span className="signal-label">Build with us</span><h2>Follow the product as the decision layer evolves.</h2></div><Link href="/signup" className="btn-primary">Create a workspace <Icon name="arrow" size={15} /></Link></div></section>
      <Footer />
    </main>
  );
}
